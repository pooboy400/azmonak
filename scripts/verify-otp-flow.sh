#!/bin/bash
# Reproduce the exact gateway-header combination that produced
# "Invalid Server Actions request." and run the real OTP flow end-to-end.
set -u
BASE=http://localhost:3000
ORIGIN="https://preview-chat-92f340ae-b8b5-4e53-adbb-3fbcdbca8165.space-z.ai"
XFH="ws-ad-d-dbbccfc-mxsluahjwx.cn-hongkong-vpc.fcapp.run"
PHONE="09123456789"
LOG=/home/z/my-project/dev.log

ids=$(node /home/z/my-project/scripts/extract-action-ids.js)
echo "action ids: $ids"
REQ_ID=$(echo "$ids" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const m=JSON.parse(d);console.log(m.requestOtpAction||"")})')
VER_ID=$(echo "$ids" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const m=JSON.parse(d);console.log(m.verifyOtpAction||"")})')
[ -z "$REQ_ID" ] && { echo "NO requestOtpAction id found"; exit 1; }

MARK=$(date +%s%N)
echo "== [1] request OTP through preview-origin headers =="
curl -s -o /home/z/my-project/scripts/.verify-req.txt -w "HTTP %{http_code}\n" -X POST "$BASE/portal/login" \
  -H "Origin: $ORIGIN" -H "x-forwarded-host: $XFH" \
  -H "Content-Type: text/plain;charset=UTF-8" -H "Next-Action: $REQ_ID" \
  --data-raw "[{\"phone\":\"$PHONE\"}]"
echo "--- flight response (grep) ---"
rg -o 'devCode[^,}]*|"message":"[^"]*"|ok[^,}]*' /home/z/my-project/scripts/.verify-req.txt | head -5 || head -c 300 /home/z/my-project/scripts/.verify-req.txt
echo
echo "--- server log OTP line ---"
sleep 1
OTP=$(tail -n 40 "$LOG" | rg -o "\[OTP\] phone=$PHONE code=([0-9]{5})" -r '$1' | tail -1)
echo "OTP=$OTP"
[ -z "$OTP" ] && { echo "no OTP code in log"; exit 1; }

[ -z "$VER_ID" ] && { echo "NO verifyOtpAction id found"; exit 1; }
echo "== [2] verify OTP (same gateway headers, capture Set-Cookie) =="
curl -s -D /home/z/my-project/scripts/.verify-headers.txt -o /home/z/my-project/scripts/.verify-res.txt \
  -w "HTTP %{http_code}\n" -X POST "$BASE/portal/login" \
  -H "Origin: $ORIGIN" -H "x-forwarded-host: $XFH" \
  -H "Content-Type: text/plain;charset=UTF-8" -H "Next-Action: $VER_ID" \
  --data-raw "[{\"phone\":\"$PHONE\",\"code\":\"$OTP\"}]"
echo "--- response headers ---"
rg -i 'set-cookie|HTTP' /home/z/my-project/scripts/.verify-headers.txt | head -4
echo "--- flight response (grep) ---"
rg -o '"isNewUser":[a-z]+|ok[^,}]*' /home/z/my-project/scripts/.verify-res.txt | head -3

echo "== [3] negative control: hostile origin must stay blocked =="
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/portal/login" \
  -H "Origin: https://evil.example.com" -H "x-forwarded-host: $XFH" \
  -H "Content-Type: text/plain;charset=UTF-8" -H "Next-Action: $REQ_ID" \
  --data-raw "[{\"phone\":\"$PHONE\"}]"
sleep 1
tail -n 6 "$LOG" | rg "does not match|Invalid Server Actions" | tail -2
echo "== done =="
