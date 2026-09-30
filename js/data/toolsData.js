/**
 * 스마트 행정혁신 AI 러닝랩 - 바이브코딩 도구, 공식 레퍼런스, 10대 용어사전
 * 
 * [초보자 설명]
 * 이 파일은 바이브코딩 실습에 필요한 공인 도구 목록 6종,
 * 커리큘럼에서 엄선한 공식 학습 사이트 4선, 그리고 비개발자 공무원의
 * 눈높이에 맞춰 행정 실무에 빗대어 설명한 10대 웹 테크 용어사전 데이터입니다.
 */

// 1. 바이브코딩 핵심 도구 카드 6종
export const TOOLS_DATA = [
  {
    id: 'tool_aistudio',
    name: 'Google AI Studio',
    badge: '필수',
    badgeType: 'required',
    icon: '✨',
    tagline: '자연어로 웹사이트를 만들고 결과를 즉시 확인하는 메인 실습 도구',
    stage: '1단계: 아이디어 프로토타이핑 및 단일 웹앱 즉시 제작',
    firstAction: 'Google 계정으로 로그인 후 [Build 모드]에서 러닝랩의 프롬프트를 붙여넣고 Run 눌러보기',
    url: 'https://aistudio.google.com/',
    note: '무료 토큰이 기본 제공되며 별도 설치 없이 브라우저 탭 하나로 완결됩니다.'
  },
  {
    id: 'tool_aistudio_guide',
    name: 'Google AI Studio 제작 가이드',
    badge: '참고',
    badgeType: 'reference',
    icon: '📖',
    tagline: '제미나이 Build 모드의 공식 사용법과 현재 지원 기능을 확인하는 안내서',
    stage: '2단계: 시스템 프롬프트 설정 및 모델 파라미터 조율 시',
    firstAction: 'System Instruction 작성 팁과 UI 화면 미리보기 기능 둘러보기',
    url: 'https://ai.google.dev/gemini-api/docs/aistudio-build-mode',
    note: '구글 개발자 포털의 공식 기술 문서입니다.'
  },
  {
    id: 'tool_mdn',
    name: 'MDN 웹 개발 학습 포털',
    badge: '참고',
    badgeType: 'reference',
    icon: '🌐',
    tagline: 'HTML, CSS, JavaScript 등 웹의 표준 기초 개념을 체계적으로 설명하는 웹 백과사전',
    stage: '2단계: AI가 짠 코드의 태그나 스타일 의미가 궁금할 때',
    firstAction: 'HTML 기초 문서에서 <button>, <input> 태그의 속성 찾아보기',
    url: 'https://developer.mozilla.org/ko/docs/Learn_web_development',
    note: '모질라 재단이 운영하는 전 세계 표준 웹 기술 한국어 문서입니다.'
  },
  {
    id: 'tool_github',
    name: 'GitHub (깃허브)',
    badge: '선택',
    badgeType: 'optional',
    icon: '🐙',
    tagline: '코드 보관, 변경 이력 관리, 그리고 무료 웹사이트 주소(URL) 배포 서비스',
    stage: '3단계: 완성된 웹앱을 다른 직원들과 링크로 공유하고 싶을 때',
    firstAction: '무료 계정 생성 후 저장소(Repository)를 만들고 HTML 파일 업로드해 보기',
    url: 'https://github.com/',
    note: 'GitHub Pages 기능을 켜면 단일 HTML 파일을 전 세계에 무료로 띄울 수 있습니다.'
  },
  {
    id: 'tool_vscode',
    name: 'Visual Studio Code',
    badge: '선택',
    badgeType: 'optional',
    icon: '💻',
    tagline: '내 컴퓨터에서 코드를 직접 살펴보고 편리하게 수정할 수 있는 세계 1위 코드 편집기',
    stage: '3단계: 긴 코드를 내 PC에 저장하고 자동 정렬이나 세부 수정을 하고 싶을 때',
    firstAction: 'PC에 설치 후 Live Server 확장 프로그램을 깔아 로컬에서 웹페이지 띄워보기',
    url: 'https://code.visualstudio.com/',
    note: '마이크로소프트가 제공하는 무료 오픈소스 프로그램입니다.'
  },
  {
    id: 'tool_firebase',
    name: 'Firebase (파이어베이스)',
    badge: '심화',
    badgeType: 'advanced',
    icon: '🔥',
    tagline: '회원 로그인과 여러 기기에서 함께 쓰는 실시간 클라우드 데이터베이스 확장 도구',
    stage: '4단계: 동아리원들이 각자 입력한 데이터가 실시간으로 동기화되어야 할 때',
    firstAction: 'Firestore Database 무료 요금제 범위와 기본 원리 살펴보기',
    url: 'https://firebase.google.com/',
    note: '서버 구축 없이 구글 클라우드를 통해 데이터베이스를 연동할 수 있는 심화 단계 도구입니다.'
  }
];

// 2. 공식 학습 자료 및 추천 레퍼런스 4선 (커리큘럼 4절)
export const OFFICIAL_REFERENCES = [
  {
    id: 'ref_gemini_docs',
    title: 'Google AI Studio Docs & Prompt Gallery',
    provider: 'Google AI',
    desc: '시스템 프롬프트(System Instruction) 설정법과 제미나이 멀티모달 프롬프팅 공식 튜토리얼 및 모범 프롬프트 갤러리',
    url: 'https://ai.google.dev/gemini-api/docs',
    tag: '공식 튜토리얼'
  },
  {
    id: 'ref_anthropic_tutorial',
    title: 'Anthropic Interactive Prompt Tutorial',
    provider: 'Anthropic',
    desc: '프롬프트를 체계적으로 다듬는 기법(Role, Few-shot, Chain-of-Thought)을 직접 브라우저에서 실습하는 대화형 코스',
    url: 'https://github.com/anthropics/prompt-eng-interactive-tutorial',
    tag: '대화형 실습'
  },
  {
    id: 'ref_learn_prompting',
    title: 'Learn Prompting (한국어 지원)',
    provider: 'LearnPrompting.org',
    desc: '입문자부터 실무자까지 무료로 볼 수 있는 세계 최대 규모의 오픈소스 프롬프트 엔지니어링 가이드',
    url: 'https://learnprompting.org/ko/docs/intro',
    tag: '입문자 필독'
  },
  {
    id: 'ref_nara_edu',
    title: '나라배움터(e-Learning) 공공 디지털 역량 플랫폼',
    provider: '국가공무원인재개발원',
    desc: '중앙·지자체 공무원을 위한 생성형 AI 행정 혁신 공식 e-러닝 강좌 및 최신 정부 가이드라인 교육',
    url: 'https://e-learning.nhi.go.kr/',
    tag: '공직자 공인 연수'
  }
];

// 3. 공공행정 10대 용어사전
export const GLOSSARY_DATA = [
  {
    id: 'term_1',
    term: '프롬프트 (Prompt)',
    meaning: 'AI 모델에게 원하는 작업, 맥락, 서식을 전달하기 위해 사람이 입력하는 자연어 명령어',
    adminAnalogy: '새로 발령받은 신임 실무관에게 업무 지시를 내릴 때 건네는 [구체적인 업무 추진 계획서]'
  },
  {
    id: 'term_2',
    term: '바이브코딩 (Vibe Coding)',
    meaning: '복잡한 프로그래밍 언어 문법을 암기하지 않고, 일상의 자연어 대화와 피드백만으로 소프트웨어를 만드는 최신 개발 방식',
    adminAnalogy: '직접 벽돌을 쌓지 않고, 원하는 건물 구조를 설명하며 감리 및 검수를 담당하는 [총괄 기획관]'
  },
  {
    id: 'term_3',
    term: '프런트엔드 (Frontend)',
    meaning: '사용자가 브라우저 화면에서 직접 눈으로 보고, 버튼을 누르고, 글자를 입력하는 웹사이트의 겉면',
    adminAnalogy: '구청 민원실의 [민원 접수 창구 및 번호표 발급기 화면]'
  },
  {
    id: 'term_4',
    term: '백엔드 (Backend)',
    meaning: '화면 뒤편의 보이지 않는 서버에서 데이터의 계산, 보안 검증, 파일 저장 등을 처리하는 엔진',
    adminAnalogy: '창구 뒤편에서 결재를 처리하고 행정망 데이터를 확인하는 [주무관 책상 및 내부 전산망]'
  },
  {
    id: 'term_5',
    term: '데이터베이스 (Database, DB)',
    meaning: '웹사이트에서 수집되거나 입력된 수많은 데이터를 안전하고 체계적으로 보관하는 대형 디지털 창고',
    adminAnalogy: '모든 민원 대장과 공문서 원본이 안전하게 보관되는 [구청 종합 문서고]'
  },
  {
    id: 'term_6',
    term: 'API (Application Programming Interface)',
    meaning: '서로 다른 프로그램이나 웹사이트가 정해진 규칙에 따라 데이터를 주고받을 수 있게 이어주는 공식 연결 통로',
    adminAnalogy: '타 기관(예: 경찰청, 국세청)과 공문 및 행정 데이터를 공식적으로 주고받는 [행정정보공동이용 연계 시스템]'
  },
  {
    id: 'term_7',
    term: '배포 (Deployment)',
    meaning: '개발자가 내 컴퓨터에서 만든 웹사이트 코드를 인터넷 서버에 올려 전 세계 누구나 접속할 수 있게 여는 작업',
    adminAnalogy: '내부 기안이 완료된 정책을 구청 홈페이지에 정식으로 [주민 열람용 공고·고시]'
  },
  {
    id: 'term_8',
    term: '도메인 (Domain)',
    meaning: '복잡한 컴퓨터 숫자 주소(IP) 대신 사람이 기억하기 쉽도록 만든 인터넷 주소 (예: seoul.go.kr)',
    adminAnalogy: '도로명 주소처럼 청사를 누구나 쉽게 찾아올 수 있게 붙인 [정식 청사 도로명 팻말]'
  },
  {
    id: 'term_9',
    term: '반응형 웹 (Responsive Web)',
    meaning: 'PC 모니터, 태블릿, 스마트폰 등 화면 크기에 맞춰 레이아웃이 자동으로 최적화되어 보기 편하게 바뀌는 기술',
    adminAnalogy: '접이식 회의 테이블처럼 회의 인원에 따라 크기를 유연하게 넓히거나 줄일 수 있는 [가변형 회의실]'
  },
  {
    id: 'term_10',
    term: '버전 관리 (Version Control)',
    meaning: '코드의 수정 이력을 시간순으로 기록하여 언제든 과거의 안정적인 상태로 되돌릴 수 있게 해주는 안전망',
    adminAnalogy: '[기안문_초안 &rarr; 기안문_과장수정 &rarr; 기안문_최종결재]로 문서의 변경 이력을 추적 관리하는 [온나라 문서 이력 관리]'
  }
];
