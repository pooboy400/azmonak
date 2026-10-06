#!/usr/bin/env bash
# Downloads SAMPLE profile photos (i.pravatar.cc placeholder portraits)
# into public/avatars/sample/ — one per seed user, gender-matched to nicknames.
# This whole folder is sample-only: db:clean-sample removes it along with DB rows.
# NOTE: randomuser.me proved flaky from this environment (intermittent 404);
# i.pravatar.cc verified stable (Cloudflare-cached, ~15-20KB per photo).
set -u
DEST="/home/z/my-project/public/avatars/sample"
mkdir -p "$DEST"
BASE="https://i.pravatar.cc/300"
# file : pravatar img index (gender-matched to the Persian nickname)
MAP=(
  "smpu01.jpg 1"   # درسا (f)
  "smpu02.jpg 3"   # آرش (m)
  "smpu03.jpg 5"   # مینا (f)
  "smpu04.jpg 6"   # کیان (m)
  "smpu05.jpg 9"   # نگار (f)
  "smpu06.jpg 7"   # سامان (m)
  "smpu07.jpg 10"  # تارا (f)
  "smpu08.jpg 8"   # پارسا (m)
  "smpu09.jpg 16"  # رها (f)
  "smpu10.jpg 20"  # شیوا (f)
  "smpu11.jpg 11"  # امیر (m)
  "smpu12.jpg 21"  # درنا (f)
  "smpu13.jpg 12"  # بهنام (m)
  "smpu14.jpg 23"  # سپیده (f)
  "smpu15.jpg 13"  # فرزاد (m)
  "smpu16.jpg 24"  # نگین (f)
  "smpu17.jpg 25"  # آوا (f)
  "smpu18.jpg 14"  # هیراد (m)
  "smpu19.jpg 26"  # مهسا (f)
  "smpu20.jpg 15"  # نوید (m)
  "smpu21.jpg 33"  # آریا (m)
  "smpu22.jpg 29"  # النا (f)
  "smpu23.jpg 51"  # متین (m)
  "smpu24.jpg 31"  # سارا (f)
  "smpt01.jpg 52"  # فرشاد کاویانی (دبیر, m)
  "smpt02.jpg 32"  # لیلا موسوی (دبیر, f)
)
fail=0
for entry in "${MAP[@]}"; do
  name="${entry%% *}"
  idx="${entry#* }"
  if [ -s "$DEST/$name" ]; then
    echo "skip  $name (exists)"
    continue
  fi
  if curl -sf -L --max-time 20 --retry 2 -o "$DEST/$name" "$BASE?img=$idx"; then
    echo "ok    $name  <-  img=$idx"
  else
    echo "FAIL  $name  <-  img=$idx"
    fail=1
  fi
  sleep 0.3
done
echo "---"
echo "files: $(ls -1 "$DEST" | wc -l)"
exit $fail
