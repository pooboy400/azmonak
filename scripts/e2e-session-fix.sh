#!/bin/bash
# E2E — OTP dev-code در همهٔ محیط‌ها + ماندگاری نشست بعد از بستن تب + خروج بدون حذف داده
set -u
cd /home/z/my-project
PHONE="09990000010"
BASE="http://localhost:3000"

echo "=== STEP 0: start dev server ==="
bun run dev > /dev/null 2>&1 &
SRV=$!
code="000"
for i in $(seq 1 40); do
  sleep 2
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE/portal/login" 2>/dev/null)
  if [ "$code" = "200" ]; then echo "SERVER_UP after ${i}x2s"; break; fi
done
if [ "$code" != "200" ]; then echo "SERVER_FAILED"; kill $SRV 2>/dev/null; exit 1; fi

ab() { agent-browser "$@" 2>&1; }
ref() { echo "$1" | grep -oE "ref=e[0-9]+" | head -1 | cut -d= -f2; }

echo "=== STEP 1: open login (clear cookies) ==="
ab cookies clear > /dev/null
ab open "$BASE/portal/login" | tail -1
sleep 2

echo "=== STEP 2: request OTP — dev code must be visible ==="
SNAP=$(ab snapshot -i)
PHONE_REF=$(ref "$(echo "$SNAP" | grep -iE 'textbox "شماره موبایل"')")
BTN_REF=$(ref "$(echo "$SNAP" | grep -E 'button "دریافت کد تأیید"')")
echo "PHONE_REF=$PHONE_REF BTN_REF=$BTN_REF"
if [ -z "$PHONE_REF" ] || [ -z "$BTN_REF" ]; then echo "FAIL_REFS_STEP2"; kill $SRV 2>/dev/null; exit 1; fi
ab fill "$PHONE_REF" "$PHONE" > /dev/null
ab click "$BTN_REF" > /dev/null
sleep 3
SNAP2=$(ab snapshot -i)
echo "$SNAP2" | grep -B1 -A3 "dev mode" | head -8
DEVCODE=$(echo "$SNAP2" | grep -A2 "dev mode" | grep -oE "[0-9]{5}" | head -1)
echo "DEVCODE=$DEVCODE"
if [ -z "$DEVCODE" ]; then echo "FAIL_NO_DEVCODE"; kill $SRV 2>/dev/null; exit 1; fi

echo "=== STEP 3: verify OTP → dashboard ==="
OTP_REF=$(ref "$(echo "$SNAP2" | grep -iE 'textbox' | head -1)")
LOGIN_BTN=$(ref "$(echo "$SNAP2" | grep -E 'button "ورود به پورتال"')")
echo "OTP_REF=$OTP_REF LOGIN_BTN=$LOGIN_BTN"
ab fill "$OTP_REF" "$DEVCODE" > /dev/null
ab click "$LOGIN_BTN" > /dev/null
ab wait --url "/portal" --timeout 20000 > /dev/null 2>&1
sleep 2
echo "URL_NOW=$(ab get url)"
ab snapshot -i | grep -E 'شیوا|خروج|داشبورد' | head -5

echo "=== STEP 4: cookie attributes ==="
ab cookies | grep -iE "azm_session" | head -3

echo "=== STEP 5: close tab → reopen → still logged in? ==="
ab tab new "about:blank" > /dev/null
sleep 1
TABS=$(ab tab)
echo "TABS: $(echo "$TABS" | tr '\n' ' ' | head -c 200)"
ab tab 1 > /dev/null
ab tab close > /dev/null
sleep 1
ab open "$BASE/portal" > /dev/null
sleep 4
echo "URL_AFTER_TAB_CLOSE=$(ab get url)"
ab snapshot -i | grep -E 'شیوا|خروج|ورود به پورتال' | head -5

echo "=== STEP 6: logout ==="
OUT_REF=$(ref "$(ab snapshot -i | grep -E 'button "خروج"')")
echo "OUT_REF=$OUT_REF"
ab click "$OUT_REF" > /dev/null
ab wait --url "/portal/login" --timeout 20000 > /dev/null 2>&1
sleep 2
echo "URL_AFTER_LOGOUT=$(ab get url)"
ab open "$BASE/portal" > /dev/null
sleep 3
echo "URL_PORTAL_AFTER_LOGOUT(expect login)=$(ab get url)"

echo "=== STEP 7: login again — data must survive ==="
sleep 46
ab open "$BASE/portal/login" > /dev/null
sleep 2
SNAP3=$(ab snapshot -i)
P2=$(ref "$(echo "$SNAP3" | grep -iE 'textbox "شماره موبایل"')")
B2=$(ref "$(echo "$SNAP3" | grep -E 'button "دریافت کد تأیید"')")
ab fill "$P2" "$PHONE" > /dev/null
ab click "$B2" > /dev/null
sleep 3
SNAP4=$(ab snapshot -i)
CODE2=$(echo "$SNAP4" | grep -A2 "dev mode" | grep -oE "[0-9]{5}" | head -1)
echo "CODE2=$CODE2"
if [ -z "$CODE2" ]; then echo "FAIL_NO_CODE2"; kill $SRV 2>/dev/null; exit 1; fi
O2=$(ref "$(echo "$SNAP4" | grep -iE 'textbox' | head -1)")
L2=$(ref "$(echo "$SNAP4" | grep -E 'button "ورود به پورتال"')")
ab fill "$O2" "$CODE2" > /dev/null
ab click "$L2" > /dev/null
ab wait --url "/portal" --timeout 20000 > /dev/null 2>&1
sleep 2
echo "URL_RELOGIN=$(ab get url)"
ab snapshot -i | grep -E 'شیوا|داشبورد|شروع' | head -6

echo "=== STEP 8: page errors ==="
ab errors | tail -4

echo "=== DONE ==="
kill $SRV 2>/dev/null
