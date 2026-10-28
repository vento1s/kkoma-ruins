# 꼬마 탐험가의 유적 · 배포 안내

이 폴더를 그대로 Vercel에 올리면 됩니다. 빌드 과정은 없습니다.

| 파일 | 하는 일 |
|---|---|
| `index.html` | 게임 전체 (친구 순위표 포함) |
| `config.js` | Supabase 주소와 공개 키를 넣는 곳 |
| `supabase.sql` | 순위표 테이블을 만드는 SQL |
| `vercel.json` | Vercel 설정 |

## 1. Supabase: 순위표 DB 만들기 (약 3분)

1. https://supabase.com 에 로그인하고 **New project** 를 만듭니다. 지역은 `Northeast Asia (Seoul)` 을 고르세요.
2. 왼쪽 메뉴 **SQL Editor** → **New query** 에 `supabase.sql` 내용을 통째로 붙여 넣고 **Run** 을 누릅니다.
3. **Project Settings → API** 에서 두 값을 복사합니다.
   - Project URL (예: `https://abcd1234.supabase.co`)
   - `anon` `public` 키
4. `config.js` 의 빈 따옴표 안에 두 값을 넣고 저장합니다.

`service_role` 키는 절대 넣지 마세요. `anon` 키는 브라우저에 공개되도록 만든 키이고, 위 SQL이 "읽기와 추가만 가능, 수정·삭제 불가"로 막아 둡니다.

## 2. Vercel: 주소 얻기 (약 3분)

방법 A: GitHub 저장소로 올리기 (추천, 이후 수정이 자동 배포됨)
1. GitHub에 새 저장소를 만들고 이 폴더의 파일을 올립니다.
2. https://vercel.com/new 에서 그 저장소를 **Import** 합니다.
3. Framework Preset 은 **Other**, Build Command 와 Output Directory 는 비워 두고 **Deploy**.
4. 몇 초 뒤 `프로젝트이름.vercel.app` 주소가 생깁니다.

방법 B: 내 컴퓨터에서 명령어로 올리기
```
cd 이_폴더
npx vercel          # 처음엔 로그인과 질문 몇 개가 나옵니다. 전부 기본값으로 엔터
npx vercel --prod   # 정식 주소로 배포
```

## 3. 내 도메인 연결 (선택)

Vercel 프로젝트 → **Settings → Domains** 에 도메인을 입력하면, 등록 업체(가비아 등)에 넣을 DNS 값을 알려 줍니다.
- 루트 도메인(`example.com`): A 레코드 `76.76.21.21`
- 서브 도메인(`game.example.com`): CNAME `cname.vercel-dns.com`

Vercel에서 바로 도메인을 사도 됩니다. 이 경우 DNS 설정은 자동입니다.

## 순위표 동작 방식

- 화면 아래 **친구 순위** 에서 닉네임을 저장하면, 스테이지를 깰 때마다 걸음 수가 올라갑니다.
- 스테이지마다 닉네임별 최소 걸음 수로 상위 10명을 보여 줍니다.
- `config.js` 가 비어 있으면 순위표는 숨겨지고 게임만 동작합니다.
- 친구끼리 쓰는 용도라 로그인은 없습니다. 같은 닉네임을 다른 사람이 쓸 수 있고, 마음먹으면 가짜 기록도 넣을 수 있습니다. 공개 서비스로 키울 때는 Supabase 로그인을 붙이는 것이 좋습니다.

## 기록 정리하기

Supabase **Table Editor → scores** 에서 이상한 기록을 직접 지울 수 있습니다.

## 게임 수정하기 (개발용)

배포되는 파일은 루트의 `index.html` 하나이고, 원본은 `tools/` 에 있습니다. `tools/` 는 Vercel에 올라가지 않습니다.

| 파일 | 내용 |
|---|---|
| `tools/levels.json` | 스테이지 맵과 안내 문구 |
| `tools/core.js` | 게임 규칙 (돌 밀기·낙하·딱정벌레 등) |
| `tools/shell.html` | 그래픽, 소리, 조작, 화면, 순위표 |
| `tools/build.py` | 위 세 파일을 합쳐 `index.html` 을 만듦 |
| `tools/solve.js` | 스테이지가 풀리는지 확인하는 자동 풀이 (`node tools/solve.js 스테이지번호-1`) |
| `tools/gen.js` | 스테이지를 더 어렵게 다듬는 자동 탐색 |

수정 후 `python3 tools/build.py` 를 실행하고 커밋·푸시하면 Vercel이 자동으로 다시 배포합니다.

맵 기호: `#` 벽, `%` 금 간 돌, `H` 사다리, `^` 가시, `E` 출구, `P` 시작 위치, `C` 아기 새, `B` 딱정벌레, `O` 정육면 돌, 소문자(같은 글자끼리 붙은 칸) = 여러 칸짜리 돌.
