/**
 * 스마트 행정혁신 AI 러닝랩 - 독립 실행형 통합 번들 스크립트 (app.bundle.js)
 * 
 * [초보자 설명]
 * 이 파일은 로컬 PC 환경(file:// 프로토콜)에서 웹 브라우저가 보안(CORS) 에러 없이
 * 더블클릭만으로 완벽하게 동작하도록 7개의 스크립트 모듈을 순서대로 하나로 통합한 파일입니다.
 * 외부 웹서버 없이도 16개 차시, 48개 퀴즈, 프롬프트 마법사, 미션, 로컬 저장소가 즉시 100% 작동합니다.
 */

(function() {
  'use strict';


/* ==========================================================================
 * [모듈 로드] storage.js
 * ========================================================================== */

/**
 * 스마트 행정혁신 AI 러닝랩 - 로컬 스토리지 & 게이미피케이션 상태 관리 엔진
 * 
 * [초보자 설명]
 * 이 스크립트는 학습자의 모든 진도, 퀴즈 기록, 획득한 경험치(XP), 배지,
 * 작성한 프롬프트 및 미션 회고를 사용자의 컴퓨터 브라우저(localStorage)에 안전하게 저장하고 관리합니다.
 * 외부 서버나 회원가입 없이도 브라우저를 닫았다가 다시 열어도 학습 내용이 그대로 유지됩니다.
 */

const STORAGE_KEY = 'SMART_GOV_AI_LEARNING_DATA_v1';

// 초기 기본 데이터 구조
const defaultState = {
  version: '1.0.0',
  completedLessons: [],       // 완료한 차시 ID 배열 (예: ['lesson_1', 'lesson_2'])
  quizHistory: {},            // 퀴즈 ID별 풀이 기록 { [quizId]: { attempts: 1, firstCorrect: true, isCorrect: true, lastAnswer: 0 } }
  wrongQuestions: [],         // 현재 오답 목록 (퀴즈 ID 배열)
  reviewedQuestions: [],      // 오답 복습을 완료한 퀴즈 ID 배열
  earnedXP: 0,                // 총 누적 경험치
  xpLogs: [],                 // 경험치 지급 기록 (중복 지급 방지용 고유 key 관리)
  badges: [],                 // 획득한 배지 ID 배열
  savedPrompts: [],           // 사용자가 생성하거나 수정한 프롬프트 목록 [{ id, title, promptText, createdAt }]
  missionSubmissions: {},     // 미션 완료 데이터 { [missionId]: { checklist: [], resultUrl: '', retroLearned: '', retroDifficult: '', retroImprove: '', completedAt: '' } }
  studyDates: [],             // 학습을 진행한 실제 날짜 목록 (YYYY-MM-DD)
  createdAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString()
};

// 레벨 정의 (메타프롬프트 규격)
const LEVEL_TIERS = [
  { minXP: 0, maxXP: 99, title: 'AI 새싹', icon: '🌱', description: '생성형 AI와 공공행정 혁신의 첫걸음을 내딛은 학습자' },
  { minXP: 100, maxXP: 299, title: 'AI 탐험가', icon: '🧭', description: '기본 프롬프트 원리를 익히고 실무 적용을 탐색하는 단계' },
  { minXP: 300, maxXP: 599, title: '업무 활용가', icon: '💼', description: '행정 문서 작성 및 보안 지침을 지키며 AI를 활용하는 숙련자' },
  { minXP: 600, maxXP: 999, title: '바이브 메이커', icon: '🛠️', description: '자연어로 필요한 행정 웹도구를 직접 기획하고 구현하는 제작자' },
  { minXP: 1000, maxXP: Infinity, title: '행정혁신 실천가', icon: '🏆', description: '조직의 일하는 방식을 스마트하게 혁신하는 최고 단계' }
];

// 배지 정의 (메타프롬프트 규격 6종)
const BADGE_DEFINITIONS = [
  {
    id: 'first_step',
    name: '첫걸음',
    icon: '🚀',
    condition: '첫 차시(1차시 이상)를 완료했을 때 획득',
    check: (state) => state.completedLessons.length >= 1
  },
  {
    id: 'prompt_architect',
    name: '프롬프트 설계자',
    icon: '📐',
    condition: '프롬프트 실습실에서 프롬프트 1개 이상을 저장했을 때 획득',
    check: (state) => (state.savedPrompts && state.savedPrompts.length >= 1)
  },
  {
    id: 'safe_habit',
    name: '검증 습관',
    icon: '🛡️',
    condition: '책임 있는 AI 활용 모듈(모듈 4: 7~8차시)을 모두 완료했을 때 획득',
    check: (state) => state.completedLessons.includes('lesson_7') && state.completedLessons.includes('lesson_8')
  },
  {
    id: 'first_maker',
    name: '첫 제작 성공',
    icon: '🎨',
    condition: '만들기 미션 중 1개 이상을 완료하고 회고를 기록했을 때 획득',
    check: (state) => Object.keys(state.missionSubmissions || {}).length >= 1
  },
  {
    id: 'steady_learner',
    name: '꾸준한 학습자',
    icon: '📅',
    condition: '서로 다른 날짜에 3일 이상 학습 활동을 진행했을 때 획득',
    check: (state) => (state.studyDates && state.studyDates.length >= 3)
  },
  {
    id: 'course_complete',
    name: '과정 완주',
    icon: '👑',
    condition: '16개 전 차시와 필수 미션 3개를 모두 완주했을 때 획득',
    check: (state) => {
      const hasAllLessons = state.completedLessons.length >= 16;
      const subs = state.missionSubmissions || {};
      const hasReqMissions = subs['mission_1'] && subs['mission_2'] && subs['mission_3'];
      return hasAllLessons && hasReqMissions;
    }
  }
];

class StorageManager {
  constructor() {
    this.state = this.loadState();
    this.recordTodayStudy();
  }

  // 로컬 스토리지에서 상태 불러오기
  loadState() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        return { ...defaultState };
      }
      const parsed = JSON.parse(serialized);
      // 기존 저장 데이터와 기본 구조 병합 (버전 업그레이드 호환)
      return {
        ...defaultState,
        ...parsed,
        completedLessons: parsed.completedLessons || [],
        quizHistory: parsed.quizHistory || {},
        wrongQuestions: parsed.wrongQuestions || [],
        reviewedQuestions: parsed.reviewedQuestions || [],
        xpLogs: parsed.xpLogs || [],
        badges: parsed.badges || [],
        savedPrompts: parsed.savedPrompts || [],
        missionSubmissions: parsed.missionSubmissions || {},
        studyDates: parsed.studyDates || []
      };
    } catch (e) {
      console.error('로컬스토리지 불러오기 오류:', e);
      return { ...defaultState };
    }
  }

  // 상태를 로컬 스토리지에 영구 저장
  saveState() {
    try {
      this.state.lastUpdated = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      // 저장 후 배지 자동 갱신 검사
      this.evaluateBadges();
      // 커스텀 이벤트 발행 (UI 실시간 갱신용)
      window.dispatchEvent(new CustomEvent('learning-state-updated', { detail: this.state }));
    } catch (e) {
      console.error('로컬스토리지 저장 오류:', e);
    }
  }

  // 오늘 날짜(YYYY-MM-DD)를 학습 날짜 목록에 기록
  recordTodayStudy() {
    const today = new Date().toISOString().split('T')[0];
    if (!this.state.studyDates.includes(today)) {
      this.state.studyDates.push(today);
      this.saveState();
    }
  }

  // 현재 전체 상태 반환
  getState() {
    return this.state;
  }

  // 차시 완료 토글 또는 등록
  completeLesson(lessonId) {
    if (!this.state.completedLessons.includes(lessonId)) {
      this.state.completedLessons.push(lessonId);
      // 차시 최초 완료 보상: 20 XP
      this.addXP(`lesson_${lessonId}`, 20, `${lessonId} 차시 최초 완료`);
      this.saveState();
      return true;
    }
    return false;
  }

  // 퀴즈 풀이 결과 저장
  recordQuizAttempt(quizId, isCorrect, chosenOptionIndex) {
    const isFirstTime = !this.state.quizHistory[quizId];
    const prevHistory = this.state.quizHistory[quizId] || { attempts: 0 };

    this.state.quizHistory[quizId] = {
      attempts: prevHistory.attempts + 1,
      firstCorrect: isFirstTime ? isCorrect : prevHistory.firstCorrect,
      isCorrect: isCorrect,
      lastAnswer: chosenOptionIndex,
      updatedAt: new Date().toISOString()
    };

    if (isCorrect) {
      // 최초 정답 시 10 XP 지급
      if (isFirstTime) {
        this.addXP(`quiz_${quizId}`, 10, `퀴즈 [${quizId}] 최초 정답`);
      }
      // 오답 목록에 있었다면 복습 완료 처리
      if (this.state.wrongQuestions.includes(quizId)) {
        this.state.wrongQuestions = this.state.wrongQuestions.filter(id => id !== quizId);
        if (!this.state.reviewedQuestions.includes(quizId)) {
          this.state.reviewedQuestions.push(quizId);
        }
      }
    } else {
      // 오답 발생 시 오답 목록에 추가
      if (!this.state.wrongQuestions.includes(quizId)) {
        this.state.wrongQuestions.push(quizId);
      }
    }

    this.saveState();
  }

  // 경험치(XP) 추가 (중복 방지 키 확인)
  addXP(uniqueKey, amount, reason) {
    const alreadyEarned = this.state.xpLogs.some(log => log.key === uniqueKey);
    if (!alreadyEarned) {
      this.state.earnedXP += amount;
      this.state.xpLogs.push({
        key: uniqueKey,
        amount: amount,
        reason: reason,
        date: new Date().toISOString()
      });
      return true;
    }
    return false;
  }

  // 현재 레벨 정보 계산
  getCurrentLevel() {
    const xp = this.state.earnedXP;
    let currentLevel = LEVEL_TIERS[0];
    let nextLevel = LEVEL_TIERS[1];

    for (let i = 0; i < LEVEL_TIERS.length; i++) {
      if (xp >= LEVEL_TIERS[i].minXP && xp <= LEVEL_TIERS[i].maxXP) {
        currentLevel = LEVEL_TIERS[i];
        nextLevel = LEVEL_TIERS[i + 1] || null;
        break;
      }
    }

    let progressPercent = 100;
    if (nextLevel) {
      const range = nextLevel.minXP - currentLevel.minXP;
      const progress = xp - currentLevel.minXP;
      progressPercent = Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
    }

    return {
      currentLevel,
      nextLevel,
      xp,
      progressPercent
    };
  }

  // 배지 수여 조건 자동 검사
  evaluateBadges() {
    let newlyEarned = [];
    BADGE_DEFINITIONS.forEach(b => {
      if (!this.state.badges.includes(b.id)) {
        if (b.check(this.state)) {
          this.state.badges.push(b.id);
          newlyEarned.push(b);
        }
      }
    });

    if (newlyEarned.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      // 새 배지 획득 이벤트 알림
      newlyEarned.forEach(badge => {
        window.dispatchEvent(new CustomEvent('badge-earned', { detail: badge }));
      });
    }
  }

  // 프롬프트 저장
  saveCustomPrompt(title, promptText) {
    const newPrompt = {
      id: 'prompt_' + Date.now(),
      title: title || '행정 실무 웹 프롬프트',
      promptText: promptText,
      createdAt: new Date().toISOString()
    };
    this.state.savedPrompts.unshift(newPrompt);
    this.saveState();
    return newPrompt;
  }

  // 프롬프트 삭제
  deleteCustomPrompt(promptId) {
    this.state.savedPrompts = this.state.savedPrompts.filter(p => p.id !== promptId);
    this.saveState();
  }

  // 만들기 미션 결과 제출 및 저장
  submitMission(missionId, { checklist, resultUrl, retroLearned, retroDifficult, retroImprove }) {
    const isFirstTime = !this.state.missionSubmissions[missionId];

    this.state.missionSubmissions[missionId] = {
      checklist: checklist || [],
      resultUrl: resultUrl || '',
      retroLearned: retroLearned || '',
      retroDifficult: retroDifficult || '',
      retroImprove: retroImprove || '',
      completedAt: new Date().toISOString()
    };

    // 실습 미션 최초 완료: 50 XP
    if (isFirstTime) {
      this.addXP(`mission_${missionId}`, 50, `미션 [${missionId}] 완료 및 회고 제출`);
    }

    this.saveState();
    return true;
  }

  // 데이터 내보내기 (JSON 백업)
  exportToJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `스마트행정혁신_학습기록백업_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  // 데이터 가져오기 (JSON 복원)
  importFromJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('올바른 JSON 데이터 형식이 아닙니다.');
      }
      // 최소 스키마 확인
      if (!parsed.completedLessons && !parsed.quizHistory) {
        throw new Error('스마트 행정혁신 학습 기록 파일이 아닙니다.');
      }

      this.state = {
        ...defaultState,
        ...parsed
      };
      this.saveState();
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  // 데이터 전체 초기화
  resetAllData() {
    this.state = { ...defaultState, studyDates: [new Date().toISOString().split('T')[0]] };
    localStorage.removeItem(STORAGE_KEY);
    this.saveState();
  }
}

// 싱글톤 인스턴스 내보내기
const storageManager = new StorageManager();



/* ==========================================================================
 * [모듈 로드] data/curriculumData.js
 * ========================================================================== */

/**
 * 스마트 행정혁신 AI 러닝랩 - 16개 차시 교육 커리큘럼 데이터
 * 
 * [초보자 설명]
 * 이 파일은 4주간 총 16개 차시로 구성된 체계적인 행정 AI 및 바이브코딩 학습 본문 데이터입니다.
 * 메타프롬프트 규격에 따라 각 차시마다 [학습 목표, 쉬운 개념 설명, 가상 행정 사례,
 * 좋은 예 vs 개선 필요 예, 3분 미니 활동, 3줄 요약, 복습 퀴즈 ID, 연계 링크]가 완벽히 포함되어 있습니다.
 */

const CURRICULUM_DATA = [
  // ================= 1주차: AI 이해와 기본 활용 =================
  {
    id: 'lesson_1',
    week: 1,
    module: 1,
    moduleTitle: '모듈 1. 생성형 AI 첫걸음',
    lessonNumber: 1,
    title: 'AI·생성형 AI·대규모 언어모델의 차이',
    time: '12분',
    level: '입문',
    objectives: [
      '인공지능(AI), 생성형 AI, 대규모 언어모델(LLM)의 개념적 계층 구조를 이해한다.',
      '전통적인 규칙 기반 컴퓨터 프로그램과 생성형 AI의 차이를 업무 관점에서 구분한다.',
      '행정 현장에서 생성형 AI를 올바른 도구로 바라보는 관점을 정립한다.'
    ],
    concept: `
      <p>공직 사회에서도 매일 듣는 <strong>인공지능(AI)</strong>, <strong>생성형 AI</strong>, <strong>대규모 언어모델(LLM)</strong>은 어떤 관계일까요?</p>
      <div class="info-card">
        <ul class="clean-list">
          <li><strong>인공지능(AI)</strong>: 인간의 지적 능력을 컴퓨터로 모방한 기술 전체를 포괄하는 가장 큰 우산입니다. (예: 주차단속 번호판 인식기)</li>
          <li><strong>생성형 AI(Generative AI)</strong>: 기존 데이터를 분석하는 데 그치지 않고, 글, 그림, 코드 등 <em>'새로운 결과물을 직접 생성'</em>하는 AI 분야입니다.</li>
          <li><strong>대규모 언어모델(LLM)</strong>: 방대한 텍스트 데이터를 학습하여 사람의 말(자연어)을 문맥에 맞춰 이해하고 다음 단어를 통계적으로 예측·생성하는 핵심 두뇌입니다. (예: Google Gemini, ChatGPT)</li>
        </ul>
      </div>
      <p>기존 컴퓨터 프로그램이 "1번 버튼을 누르면 1번 조례가 나온다"는 고정된 자판기였다면, 생성형 AI는 <strong>"수천 페이지의 업무 매뉴얼을 읽고 공무원의 질문에 맞춰 자연스럽게 요약해 주는 똑똑한 행정 인턴"</strong>에 가깝습니다.</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 민원 안내문 초안 작성',
      content: '주민자치과 김 주무관은 "주민자치센터 프로그램 접수 안내문"을 작성해야 합니다. 예전에는 작년도 한글(HWP) 문서를 찾아 날짜만 하나씩 바꾸느라 30분이 걸렸지만, LLM에게 "기존 공지 양식을 바탕으로 접수 기간과 대상 연령만 변경해 달라"고 요청하여 30초 만에 정돈된 초안을 얻었습니다.'
    },
    goodCase: `
      <strong>[좋은 프롬프트 예시]</strong><br>
      "너는 지자체 주민소통 담당 주무관이야. 50~60대 주민들을 위해 '2026년 상반기 스마트폰 기초 교육' 신청 안내문을 작성해 줘. 모집 인원은 20명, 접수처는 동 주민센터 방문 접수이며, 친근하고 명확한 어조로 일시와 유의사항을 개조식으로 정리해 줘."
    `,
    badCase: `
      <strong>[개선이 필요한 예시]</strong><br>
      "스마트폰 교육 공지문 써줘."
    `,
    caseReview: '나쁜 예시는 대상 주민의 연령대, 접수 방식, 말투 규격이 없어서 일반적인 내용만 나옵니다. 좋은 예시는 [역할, 대상, 핵심 정보, 출력 형식]을 명확히 주어 즉시 행정 문서로 활용할 수 있습니다.',
    miniActivity: {
      title: '3분 미니 활동: 내 업무에 인턴 배정하기',
      instruction: '내가 오늘 처리한 업무(기안, 보고, 민원 등) 중 "인턴 직원에게 초안 작성을 부탁하고 내가 검토만 하면 훨씬 빨랐을 일" 1가지를 머릿속에 떠올려보세요.',
      tip: '단순 요약, 일정 공지문, 회의 안건 정리 등이 가장 좋은 첫걸음입니다.'
    },
    summary3Lines: [
      '1. 생성형 AI는 기존 데이터 분석을 넘어 새로운 문장과 코드를 창작해 내는 도구입니다.',
      '2. LLM은 사람의 언어 맥락을 이해하고 다음 단어를 생성하는 핵심 기술 엔진입니다.',
      '3. AI는 완벽한 최종 결재권자가 아니며, 초안을 만들어주는 똑똑한 행정 보조자입니다.'
    ],
    quizIds: ['q1_1', 'q1_2', 'q1_3'],
    relatedAction: { text: '2차시: 환각(할루시네이션) 판별법과 데이터 교차 검증', link: 'lesson_2' }
  },

  {
    id: 'lesson_2',
    week: 1,
    module: 1,
    moduleTitle: '모듈 1. 생성형 AI 첫걸음',
    lessonNumber: 2,
    title: 'AI의 강점과 한계, 환각(Hallucination) 판별과 교차 검증',
    time: '15분',
    level: '입문',
    objectives: [
      '생성형 AI가 뛰어난 작업과 근본적으로 취약한 작업 영역을 구별한다.',
      '환각(할루시네이션) 현상의 발생 원인과 위험성을 이해한다.',
      '공공행정 실무에서 법령 조항, 통계, 예산액 교차 검증(Cross-check) 프로토콜을 체득한다.'
    ],
    concept: `
      <p>생성형 AI는 마법의 요술봉이 아닙니다. AI의 작동 원리를 알면 왜 <strong>환각 현상(Hallucination)</strong>이 생기는지 쉽게 이해할 수 있습니다.</p>
      <div class="grid-2-col">
        <div class="feature-box pros">
          <h4>🌟 AI가 매우 잘하는 일</h4>
          <ul>
            <li>방대한 보고서 및 회의록 핵심 요약</li>
            <li>문서의 어조 변환 (기안문 &rarr; 주민용 보도자료)</li>
            <li>브레인스토밍 및 정책 아이디어 발산</li>
            <li>코드 및 수식 초안 작성</li>
          </ul>
        </div>
        <div class="feature-box cons">
          <h4>⚠️ AI가 치명적으로 취약한 일</h4>
          <ul>
            <li>최신 조례 조항 및 세부 법률 해석</li>
            <li>정확한 예산 숫자 계산 및 회계 검증</li>
            <li>존재하지 않는 문서를 지어내는 일 (환각)</li>
            <li>기관 내부의 비공개 방침 판단</li>
          </ul>
        </div>
      </div>
      <p>LLM은 사실 여부를 '판단'하기보다 <strong>'그럴듯하게 이어질 단어'</strong>를 생성합니다. 따라서 <em>"지방재정법 제32조에 따라..."</em>라며 매우 그럴듯한 거짓 조항을 자신 있게 꾸며낼 수 있습니다.</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 청년 지원금 신청 자격 오류',
      content: '박 주무관이 AI에게 "우리 시 청년 기본소득 자격 요건을 표로 정리해 줘"라고 했더니, AI가 작년도 실효된 기준과 타 지자체의 조례를 섞어 그럴듯한 표를 만들었습니다. 박 주무관이 지자체 공식 고시공고를 직접 대조(Cross-check)하지 않았다면 민원 혼란이 발생할 뻔했습니다.'
    },
    goodCase: `
      <strong>[교차 검증 프로토콜 적용 예시]</strong><br>
      "AI가 요약해 준 지원금 요건 3가지(연령, 거주기간, 소득기준)를 국가법령정보센터 및 2026년도 우리 부서 사업시행계획 파일과 1:1 대조하여 확정함."
    `,
    badCase: `
      <strong>[무비판적 수용 예시]</strong><br>
      "AI가 출처까지 그럴듯하게 적어줬으니 맞겠지 하고 그대로 대외 공문서에 첨부함."
    `,
    caseReview: '공공행정에서 허위 사실 전달은 행정 신뢰도를 실추시킵니다. 법령 번호, 날짜, 금액, 자격 요건은 반드시 공무원이 공식 자료로 교차 검증해야 합니다.',
    miniActivity: {
      title: '3분 미니 활동: 환각 포착 탐정 놀이',
      instruction: 'AI가 "2026년 공무원 복무규정에 따라 연간 연가일수가 일괄 30일로 확대되었습니다"라고 답변했다면, 당신은 어디에서 사실 여부를 확인하겠습니까?',
      tip: '국가법령정보센터(law.go.kr) 또는 인사혁신처 공식 법령/지침 확인이 정답입니다.'
    },
    summary3Lines: [
      '1. AI는 사실을 아는 것이 아니라 문맥상 가장 어울리는 단어를 조합해 냅니다.',
      '2. 진짜처럼 보이지만 사실이 아닌 정보를 지어내는 현상을 환각(Hallucination)이라 부릅니다.',
      '3. 조례, 법령, 통계, 예산 수치는 반드시 공직자가 공식 원천 자료로 교차 검증해야 합니다.'
    ],
    quizIds: ['q2_1', 'q2_2', 'q2_3'],
    relatedAction: { text: '3차시: 원하는 답을 얻는 행정 특화 프롬프트 프레임워크', link: 'lesson_3' }
  },

  {
    id: 'lesson_3',
    week: 1,
    module: 2,
    moduleTitle: '모듈 2. 원하는 답을 얻는 프롬프트',
    lessonNumber: 3,
    title: '행정 특화 프롬프트 프레임워크 (TCREI & CO-STAR)',
    time: '14분',
    level: '기초',
    objectives: [
      '프롬프트 6대 핵심 구성 요소(역할, 목표, 맥락, 입력자료, 제약조건, 출력형식)를 익힌다.',
      '글로벌 프레임워크인 CO-STAR와 공공행정에 특화된 TCREI 모델의 실무 접목법을 체득한다.',
      '공공 보고서 규격(개조식, 항목 번호 체계)을 강제하는 프롬프트를 작성한다.'
    ],
    concept: `
      <p>AI에게 일을 잘 시키려면 <strong>'명령어(Prompt)'</strong>를 체계적으로 구성해야 합니다. 신규 발령받은 신임 실무관에게 업무 지시를 내릴 때처럼 육하원칙을 주어야 합니다.</p>
      <div class="info-card">
        <h4>📋 공직 행정 특화 TCREI 프레임워크</h4>
        <ul class="clean-list">
          <li><strong>Task (업무 목표)</strong>: 달성하고자 하는 구체적 행동 (예: 기안문 요약, 카드뉴스 카피 작성)</li>
          <li><strong>Context (맥락 & 배경)</strong>: 조례 근거, 사업 취지, 대상자 특성 등 배경 설명</li>
          <li><strong>Role (역할 페르소나)</strong>: "공직 15년 차 행정기획관", "친절한 민원안내 담당자"</li>
          <li><strong>Execution Guidelines (제약 조건)</strong>: 분량(A4 1장 이내), 개인정보 마스킹, 비전문용어 사용 등</li>
          <li><strong>Instruction on Format (출력 규격)</strong>: 1. &rarr; 가. &rarr; (1) 표준 행정 개조식 번호 체계 또는 마크다운 표</li>
        </ul>
      </div>
      <p>이 5가지를 갖추면 AI의 답변 품질이 300% 이상 비약적으로 향상됩니다.</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 스마트 청사 안내 보고서 작성',
      content: '스마트정보과 이 주무관은 간부회의 보고용으로 TCREI를 적용해 프롬프트를 작성했습니다. [역할: 10년 차 IT혁신관, 대상: 구청장 및 국장단, 제약: 전문용어 배제 및 3대 기대효과 포함, 형식: 개조식 보고서]. 그 결과 수정 없이 회의 자료에 바로 첨부할 수 있는 수준의 보고서가 나왔습니다.'
    },
    goodCase: `
      <strong>[TCREI를 적용한 모범 프롬프트]</strong><br>
      "[역할] 너는 공공행정 15년 차 기획조정실 행정관이야.<br>
      [맥락] 2026년 하반기 악성 민원 예방을 위한 직원 보호 조례가 신설되었어.<br>
      [목표] 전부서 직원들에게 전달할 안내 공문 초안을 작성해 줘.<br>
      [제약] 1) 법적 보호 조치 3가지를 명시할 것, 2) 위압적이지 않고 격려하는 톤 유지.<br>
      [출력형식] '1. 추진배경 &rarr; 2. 주요보호조치 &rarr; 3. 행정사항' 공공 표준 개조식 양식"
    `,
    badCase: `
      <strong>[모호한 프롬프트]</strong><br>
      "직원 보호 조례 공문 하나 써줘. 잘 써줘."
    `,
    caseReview: '모호한 지시는 AI가 임의로 서식을 정해 줄글로 길게 늘어놓게 만듭니다. TCREI를 쓰면 원하는 행정 규격을 한 번에 출력할 수 있습니다.',
    miniActivity: {
      title: '3분 미니 활동: 내 프롬프트에 Role(역할) 입히기',
      instruction: '평소 쓰던 프롬프트 앞에 "너는 ○○분야 10년 차 공공 전문가야"라는 문장을 추가했을 때 어떻게 답변 톤이 바뀌는지 상상해 보세요.',
      tip: '페르소나를 명확히 지정하면 어휘 선택과 전문성이 공공 눈높이에 맞춰집니다.'
    },
    summary3Lines: [
      '1. 프롬프트는 신임 공직자에게 업무를 지시하듯 구체적이고 체계적이어야 합니다.',
      '2. TCREI(Task, Context, Role, Execution, Instruction) 5요소를 반드시 기억하세요.',
      '3. 공공기관 특유의 개조식 보고서 양식은 출력 규격(Instruction)에서 강제할 수 있습니다.'
    ],
    quizIds: ['q3_1', 'q3_2', 'q3_3'],
    relatedAction: { text: '4차시: 행정 텍스트 변환 실습 (기획서 압축 & 보도자료)', link: 'lesson_4' }
  },

  {
    id: 'lesson_4',
    week: 1,
    module: 2,
    moduleTitle: '모듈 2. 원하는 답을 얻는 프롬프트',
    lessonNumber: 4,
    title: '행정 텍스트 변환 실습 (보고서 압축 & 보도자료/카드뉴스)',
    time: '13분',
    level: '기초',
    objectives: [
      '방대한 분량의 기획보고서를 1페이지 브리핑 핵심 요약본으로 압축하는 기법을 실습한다.',
      '동일한 정책 내용을 직원용 내부 기안문과 주민 눈높이 보도자료로 다각화한다.',
      '단계적 질문(Follow-up Prompting)으로 답변의 완성도를 점진적으로 개선한다.'
    ],
    concept: `
      <p>행정 실무에서 AI의 가장 강력한 능력 중 하나는 <strong>'원문 텍스트 변환(Text Transformation)'</strong>입니다.</p>
      <div class="info-card">
        <h4>🔄 1개의 정책 원천 데이터를 3가지 형태로 변환하기</h4>
        <ol class="clean-list">
          <li><strong>간부 브리핑용 1페이지 요약</strong>: 10페이지 기획서를 핵심 현황, 문제점, 대안 3개, 예산 소요액으로 압축</li>
          <li><strong>언론 배포용 표준 보도자료</strong>: '육하원칙 헤드라인 + 리드문 + 담당 과장 코멘트'의 기자 맞춤형 서식</li>
          <li><strong>주민 소통용 카드뉴스 카피</strong>: 행정 용어를 없애고 주민 혜택(지원금, 혜택, 신청법) 중심의 쉽고 직관적인 5장 카피</li>
        </ol>
      </div>
      <p>한 번에 완벽한 결과를 요구하기보다, <em>"보도자료 헤드라인 5개만 먼저 추천해 줘 &rarr; 그중 2번 스타일로 본문을 써줘 &rarr; 주민들이 헷갈리지 않게 유의사항을 강조해 줘"</em>와 같이 <strong>단계적 대화(Iterative Prompting)</strong>를 진행하는 것이 핵심 요령입니다.</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 폭염 종합대책 보도자료 배포',
      content: '안전총괄과 최 주무관은 30페이지짜리 "2026년 하절기 폭염 종합대책" 내부 계획 문서를 AI에 입력하고, "지자체 출입 기자가 3분 만에 기사화할 수 있는 표준 보도자료 양식으로 변환해 달라"고 요청했습니다. AI는 무더위 쉼터 확충, 살수차 운행 구간 등 주민 체감 지표를 헤드라인으로 뽑아내어 홍보팀의 극찬을 받았습니다.'
    },
    goodCase: `
      <strong>[단계적 개선 대화 흐름 예시]</strong><br>
      (1단계) "첨부된 폭염 대책 계획서에서 가장 핵심적인 정책 3가지와 기대 수치를 뽑아줘."<br>
      (2단계) "좋아. 그 내용을 바탕으로 지역 신문에 배포할 보도자료를 써줘. 헤드라인은 주민들의 관심을 끄는 질문형 2개와 사실형 2개를 각각 제안해 줘."<br>
      (3단계) "2번 사실형 헤드라인을 채택할게. 안전총괄과장의 따뜻한 당부 코멘트를 본문 중간에 가상으로 추가해 줘."
    `,
    badCase: `
      <strong>[단발성 요청 예시]</strong><br>
      "이거 보도자료로 바꿔줘. 알아서 잘 써."
    `,
    caseReview: '단계별로 피드백을 주며 발전시킬 때 공직자가 원하는 디테일(톤앤매너, 강조점, 과장 코멘트 등)이 완벽히 반영됩니다.',
    miniActivity: {
      title: '3분 미니 활동: 어려운 행정용어 번역하기',
      instruction: '우리 부서 문서에 자주 등장하는 어려운 한자어(예: "기왕의", "계상하다", "추념하다") 3개를 쉬운 순우리말이나 주민 눈높이 어휘로 바꿔보세요.',
      tip: 'AI에게 "초등학교 6학년도 단번에 이해할 수 있게 바꿔줘"라고 요청하면 탁월합니다.'
    },
    summary3Lines: [
      '1. 1개의 행정 원천 문서를 기획서, 보도자료, 카드뉴스 카피 등 다양한 형식으로 재가공할 수 있습니다.',
      '2. 한 번에 완벽을 기대하지 말고 2~3단계의 후속 질문으로 정교하게 다듬으세요.',
      '3. 주민용 홍보문은 어려운 행정 용어를 제거하고 혜택 중심으로 변환해야 합니다.'
    ],
    quizIds: ['q4_1', 'q4_2', 'q4_3'],
    relatedAction: { text: '5차시: 문서 요약과 회의록 결정사항/할일 정리', link: 'lesson_5' }
  },

  // ================= 2주차: 행정업무 적용과 책임 있는 활용 =================
  {
    id: 'lesson_5',
    week: 2,
    module: 3,
    moduleTitle: '모듈 3. 행정업무에 AI 적용하기',
    lessonNumber: 5,
    title: '문서 요약, 보고서 구성, 회의록과 액션 아이템 추출',
    time: '14분',
    level: '기초',
    objectives: [
      '어지럽게 작성된 녹취록이나 회의 메모에서 핵심 안건과 결정사항을 구조화한다.',
      '담당 부서별 후속 조치(Action Item)와 완료 기한을 명확한 표로 분류한다.',
      '보고서의 서론-본론-결론 및 논리적 전개 구조를 AI와 함께 설계한다.'
    ],
    concept: `
      <p>행정 회의는 길고 복잡하지만, 회의 후 남겨야 할 것은 <strong>'누가, 언제까지, 무엇을 할 것인가'</strong>입니다.</p>
      <div class="info-card">
        <h4>📌 회의록 정리 AI 프롬프트 3단계 규칙</h4>
        <ol class="clean-list">
          <li><strong>안건별 논의 배경 및 핵심 쟁점 추출</strong>: 단순 발언 나열이 아니라 부서 간 이견 사항 요약</li>
          <li><strong>최종 결정사항(Decision) 명시</strong>: 보류된 안건과 합의된 안건 명확히 분리</li>
          <li><strong>액션 아이템(Action Item) 표 편성</strong>: [담당 부서 / 실무자 / 구체적 과업 / 완료 목표일 / 비고] 5열 구조 강제</li>
        </ol>
      </div>
      <p>이 방식을 사용하면 1시간 분량의 긴 회의라도 10분 만에 깔끔한 회의 결과 통보 공문으로 완성할 수 있습니다.</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 지역 축제 실무추진단 회의록 정리',
      content: '문화예술과 정 주무관은 5개 부서가 모여 2시간 동안 난상토론을 벌인 축제 준비 회의 메모를 정리해야 했습니다. AI에게 "안건별로 최종 합의된 사항만 추출하고, 교통행정과, 청소자원과 등 부서별 마감 과업을 표로 정리하라"고 지시하여 회의 종료 30분 만에 모든 부서에 협조 공문을 발송했습니다.'
    },
    goodCase: `
      <strong>[액션 아이템 분배 모범 프롬프트]</strong><br>
      "아래 텍스트는 축제 안전대책 회의 녹취 요약본이야.<br>
      1. 합의된 최종 결정사항 3가지를 bullet으로 요약해 줘.<br>
      2. 담당 부서별 후속 조치를 마크다운 표로 만들어 줘. (열 구성: 부서명 | 담당 과업 | 제출 마감일 | 협조 필요 부서)<br>
      3. 논란이 있어 차기 회의로 보류된 안건은 '미결 안건'으로 별도 분리해 줘."
    `,
    badCase: `
      <strong>[단순 요청 예시]</strong><br>
      "회의록 요약해 줘."
    `,
    caseReview: '단순 요약은 발언자들의 사소한 잡담까지 뒤섞입니다. [결정사항, 부서별 과업, 미결 안건]을 구분 지정해야 실제 행정 처리가 가능합니다.',
    miniActivity: {
      title: '3분 미니 활동: 내 책상 위 메모의 액션 아이템화',
      instruction: '이번 주에 참석했던 회의나 통화 메모 중 "내가 언제까지 처리해야 하는 일" 1개를 골라 [과업명 - 마감일 - 결과물] 형태로 1줄 메모해 보세요.',
      tip: '행정 업무의 마감 기한(Due-date)을 명시하는 습관이 업무 누락을 막아줍니다.'
    },
    summary3Lines: [
      '1. 회의록 정리는 발언 기록이 아니라 결정사항과 실행 과업(Action Item)의 추출입니다.',
      '2. 담당 부서, 구체적 조치 내용, 완료 기한을 명확한 표로 구조화하도록 요청하세요.',
      '3. 합의된 사안과 다음 회의로 보류된 미결 안건을 분리해 두면 분쟁을 예방할 수 있습니다.'
    ],
    quizIds: ['q5_1', 'q5_2', 'q5_3'],
    relatedAction: { text: '6차시: 설문 및 민원 데이터 표 분류, 아이디어 발산', link: 'lesson_6' }
  },

  {
    id: 'lesson_6',
    week: 2,
    module: 3,
    moduleTitle: '모듈 3. 행정업무에 AI 적용하기',
    lessonNumber: 6,
    title: '설문 및 민원 데이터 표 분류, 아이디어 발산과 반복 업무 개선',
    time: '13분',
    level: '기초',
    objectives: [
      '정형화되지 않은 주민 주관식 설문조사 및 민원 텍스트를 범주별로 분류한다.',
      'AI를 활용하여 행정 서비스 개선 아이디어를 다각도로 발산(Brainstorming)한다.',
      '매월 반복되는 정형 보고 업무를 템플릿화하여 업무 시간을 획기적으로 단축한다.'
    ],
    concept: `
      <p>주민 수백 명이 제출한 자유 서술형 설문조사 결과를 일일이 손으로 엑셀에 분류하느라 밤을 새운 적이 있으신가요?</p>
      <div class="info-card">
        <h4>📊 비정형 민원·의견 데이터의 AI 범주화 기법</h4>
        <p>AI는 수백 줄의 자유 텍스트를 읽고 유사한 주제별로 묶어내는 <strong>군집 분류(Clustering)</strong>에 탁월합니다.</p>
        <ul class="clean-list">
          <li><strong>키워드 및 빈도 추출</strong>: "주차 부족", "소음", "가로등 조도 개선" 등 최다 언급 키워드 상위 5개 도출</li>
          <li><strong>감정 및 뉘앙스 분석</strong>: 칭찬/단순문의/강한 불만/정책 제안으로 분류</li>
          <li><strong>즉시 개선 과제 도출</strong>: 주민 불만이 집중된 지점에 대한 단기(1달 내)/중장기 대책 아이디어 제시</li>
        </ul>
      </div>
      <p>반복적인 주간·월간 정형 통계 보고 역시 프롬프트 템플릿을 한 번 짜두면 데이터만 갈아 끼워 자동화할 수 있습니다.</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 공원 만족도 주관식 응답 500건 분류',
      content: '공원녹지과 윤 주무관은 주민 500명의 주관식 건의사항을 AI에게 전달하며, [시설 노후화 / 안전 및 조명 / 청결 및 쓰레기 / 반려견 목줄 갈등] 4개 카테고리로 분류하고 발생 빈도수를 세어 표로 만들게 했습니다. 3일 걸릴 작업이 15분 만에 끝나 보고서에 반영되었습니다.'
    },
    goodCase: `
      <strong>[데이터 분류 프롬프트 예시]</strong><br>
      "아래 100건의 가상 민원 내용을 읽고 다음 작업을 수행해 줘.<br>
      1. 각 민원을 [도로/교통, 환경/위생, 복지/보건, 기타] 4개 범주 중 하나로 분류할 것.<br>
      2. 범주별 건수와 전체 대비 비율(%)을 계산하여 표로 보여줄 것.<br>
      3. '환경/위생' 민원에서 주민들이 가장 많이 지적한 핵심 원인 3가지를 요약할 것."
    `,
    badCase: `
      <strong>[비체계적 요청 예시]</strong><br>
      "이 민원들 읽어보고 어떤지 말해줘."
    `,
    caseReview: '분류할 카테고리를 미리 규정해 주지 않으면 AI가 매번 다른 기준으로 횡설수설 분류합니다. 카테고리와 출력 양식을 정의해 주세요.',
    miniActivity: {
      title: '3분 미니 활동: 우리 부서 반복 업무 템플릿 찾기',
      instruction: '매주 또는 매달 동일한 양식에 숫자와 내용만 조금씩 바꿔 작성하는 정형 보고서나 알림글 1개를 떠올려보세요.',
      tip: '고정된 뼈대를 프롬프트로 만들고 내용만 바꿔 끼우면 매주 1시간이 절약됩니다.'
    },
    summary3Lines: [
      '1. 대량의 주민 주관식 설문과 민원 텍스트를 주제별로 고속 분류할 수 있습니다.',
      '2. 분류할 카테고리(범주)와 출력 표 양식을 사전에 명확히 제시하세요.',
      '3. 반복되는 주간·월간 보고 양식을 프롬프트화하면 행정 낭비를 줄일 수 있습니다.'
    ],
    quizIds: ['q6_1', 'q6_2', 'q6_3'],
    relatedAction: { text: '7차시: 공공 AI 컴플라이언스 & 개인정보 마스킹 기법', link: 'lesson_7' }
  },

  {
    id: 'lesson_7',
    week: 2,
    module: 4,
    moduleTitle: '모듈 4. AI 결과를 검토하고 안전하게 활용하기',
    lessonNumber: 7,
    title: '공공 AI 컴플라이언스, 비공개문서 보호와 개인정보 마스킹',
    time: '15분',
    level: '중요',
    objectives: [
      '행정안전부 「공공분야 생성형 AI 활용 가이드라인」의 핵심 준수 수칙을 이해한다.',
      '비공개 업무 자료, 비밀, 개인정보를 AI에 절대 입력하지 않는 보안 원칙을 체득한다.',
      '주민번호, 연락처, 주소 등 민원인 개인정보의 비식별화(마스킹) 기법을 실습한다.'
    ],
    concept: `
      <p>공직자가 생성형 AI를 활용할 때 <strong>보안과 컴플라이언스(법규 준수)</strong>는 타협할 수 없는 절대적 최우선 원칙입니다.</p>
      <div class="danger-box">
        <h4>🚨 공공 AI 활용 3대 절대 금지 수칙</h4>
        <ul class="clean-list">
          <li><strong>1. 비공개 내부 기안문 및 비밀자료 업로드 금지</strong>: 외부 상용 클라우드 AI 모델에 입력된 데이터는 모델 학습에 재활용되거나 유출될 위험이 있습니다.</li>
          <li><strong>2. 개인식별정보(PII) 원문 입력 금지</strong>: 주민등록번호, 휴대전화번호, 상세 집주소, 계좌번호 등은 절대 금물입니다.</li>
          <li><strong>3. 미검증 결과물의 대외 공문서 무단 인용 금지</strong>: AI 생성물에 대한 법적·행정적 책임은 오직 공무원 본인에게 있습니다.</li>
        </ul>
      </div>
      <p>실제 데이터를 AI로 분석해야 할 때는 반드시 <strong>'프라이빗 프롬프팅(비식별 마스킹)'</strong>을 거쳐 <em>홍길동 &rarr; [민원인A], 010-1234-5678 &rarr; [연락처01], 서울시 ○○구 &rarr; [관내 지역]</em> 형태로 치환 후 질문해야 합니다.</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 민원인 전화번호 유출 방지 조치',
      content: '복지지원과 오 주무관은 기초수급자 지원 상담 메모 50건을 정리하기 전, 메모장에 텍스트를 붙여넣고 정규식 또는 찾기/바꾸기 기능으로 이름(김○○ &rarr; 수급자A), 주민번호(생년월일만 남기고 마스킹), 상세 주소(○○동 수준까지만 남김) 처리를 완료한 후 AI에 요약을 요청하여 완벽한 보안을 유지했습니다.'
    },
    goodCase: `
      <strong>[비식별 마스킹 처리 모범 프롬프트]</strong><br>
      "아래 가상의 비식별 처리된 민원 상담 메모를 분석해 줘.<br>
      - 민원인: [상담인A, 60대 남성, 1인 가구]<br>
      - 거주: 관내 ○○동 임대아파트<br>
      - 애로사항: 거동 불편으로 인한 도시락 배달 신청 희망<br>
      이 가상 상담인A에게 연계 가능한 지자체 복지 서비스 3가지를 추천해 줘."
    `,
    badCase: `
      <strong>[보안 위반 위험 프롬프트]</strong><br>
      "역삼동 123-45에 사는 주민등록번호 650101-1234567 홍길동씨인데, 이 사람 지원금 얼마 받을 수 있어?"
    `,
    caseReview: '실제 개인정보를 프롬프트에 넣는 순간 개인정보보호법 위반이 됩니다. 반드시 가상의 명칭이나 비식별 식별자([민원인A])로 마스킹해야 합니다.',
    miniActivity: {
      title: '3분 미니 활동: 개인정보 마스킹 실습',
      instruction: '"서울시 중구 세종대로 110, 이순신(010-9999-8888), 123456-1234567" 문장에서 개인정보 4가지를 찾아 마스킹 기호([주소], [민원인A] 등)로 치환해 보세요.',
      tip: '누구인지 특정할 수 있는 모든 단서는 마스킹 대상입니다.'
    },
    summary3Lines: [
      '1. 공공기관 내부 비밀과 비공개 자료는 외부 상용 AI에 절대 입력해서는 안 됩니다.',
      '2. 민원인 개인정보는 반드시 사전 마스킹(비식별화)을 거친 후 입력해야 합니다.',
      '3. AI 결과물에 대한 모든 행정적·법적 최종 책임은 담당 공무원에게 있습니다.'
    ],
    quizIds: ['q7_1', 'q7_2', 'q7_3'],
    relatedAction: { text: '8차시: 출처·통계·편향 검증 및 최종 행정 검토 체크리스트', link: 'lesson_8' }
  },

  {
    id: 'lesson_8',
    week: 2,
    module: 4,
    moduleTitle: '모듈 4. AI 결과를 검토하고 안전하게 활용하기',
    lessonNumber: 8,
    title: '출처·기준일·통계·편향 확인과 최종 행정 검토 체크리스트',
    time: '14분',
    level: '중요',
    objectives: [
      'AI가 생성한 답변의 출처 유효성과 기준일(시점) 차이를 확인한다.',
      '특정 성별, 계층, 지역에 대한 잠재적 편향(Bias) 표현을 감지하고 순화한다.',
      '대외 결재 및 공문 발송 전 공직자가 반드시 체크해야 할 5대 자가 점검표를 구축한다.'
    ],
    concept: `
      <p>AI가 작성한 문서를 결재권자(팀장, 과장, 국장)에게 올리기 전, 공직자는 <strong>'게이트키퍼(문지기)'</strong>가 되어야 합니다.</p>
      <div class="info-card">
        <h4>📋 공직자 AI 생성물 5대 최종 점검 체크리스트</h4>
        <ul class="clean-list">
          <li><strong>[ ] 1. 법령·조례 일치성</strong>: 인용된 법 조항의 명칭과 조·항·호가 국가법령정보센터의 현행 법과 정확히 일치하는가?</li>
          <li><strong>[ ] 2. 통계 및 수치 정확성</strong>: 예산액, 집행률, 인원수 등 수치의 원천 데이터가 부서 통계와 맞는가?</li>
          <li><strong>[ ] 3. 기준일(시점) 확인</strong>: 이미 폐지되거나 개정된 작년도 기준을 현재 기준인 것처럼 쓰고 있지 않은가?</li>
          <li><strong>[ ] 4. 공공 차별·편향 배제</strong>: 사회적 약자, 다문화, 특정 연령층에 대한 편견이나 차별적 어조가 없는가?</li>
          <li><strong>[ ] 5. 행정 문체 적합성</strong>: 주민 눈높이에 맞게 공손하고 책임감 있는 공공 언어로 정돈되었는가?</li>
        </ul>
      </div>
      <p>특정 법령이나 기관 지침을 상상으로 만들어 결재에 올리지 말고, 소속 기관의 공식 고시공고와 반드시 대조해야 합니다.</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 청년 창업 지원금 수치 교정',
      content: '일자리경제과 강 주무관은 AI가 작성해 준 청년 창업 지원사업 보고서에서 "팀당 최대 5,000만 원 지원"이라는 문구를 발견했습니다. 우리 구 본예산 편성안을 교차 확인해 보니 실제 승인된 금액은 "팀당 최대 3,000만 원"이었습니다. 체크리스트를 통해 결재 상신 직전 오류를 완벽히 바로잡았습니다.'
    },
    goodCase: `
      <strong>[검증 완료 후 결재 문구 예시]</strong><br>
      "본 계획서의 법적 근거는 『청년고용촉진 특별법』 제7조 및 『우리 구 청년 기본 조례』 제10조(2026.1.1. 개정)를 부서 공식 자료와 대조 확인하였으며, 지원 금액은 2026년도 본예산 승인액(팀당 3천만원)에 부합함을 확인함."
    `,
    badCase: `
      <strong>[미검증 상신 예시]</strong><br>
      "AI가 요약해 준 예산 수치 그대로 기안 상신함."
    `,
    caseReview: '숫자와 법령은 단 하나의 글자만 틀려도 사업 집행이 중단될 수 있습니다. 반드시 담당자가 눈으로 직접 확인해야 합니다.',
    miniActivity: {
      title: '3분 미니 활동: 모의 체크리스트 서명하기',
      instruction: '위 5대 점검 항목 중 내가 평소 가장 소홀하기 쉬웠던 항목 1가지를 골라보고, 앞으로 어떻게 검증할지 원칙을 세워보세요.',
      tip: '기준일(언제 기준 데이터인가?) 확인이 의외로 가장 많은 실수가 나오는 지점입니다.'
    },
    summary3Lines: [
      '1. AI는 결과에 책임을 지지 않으며, 모든 행정 책임은 결재자에게 귀속됩니다.',
      '2. 법령, 통계, 예산, 기준일, 편향성 5대 체크리스트를 상신 전 반드시 확인하세요.',
      '3. 공식 법령정보센터와 부서 사업계획서 대조(Cross-check)를 습관화해야 합니다.'
    ],
    quizIds: ['q8_1', 'q8_2', 'q8_3'],
    relatedAction: { text: '3주차 진입: 9차시 바이브코딩 기본 개념과 3단계 사이클', link: 'lesson_9' }
  },

  // ================= 3주차: 바이브코딩 이해와 도구 익히기 =================
  {
    id: 'lesson_9',
    week: 3,
    module: 5,
    moduleTitle: '모듈 5. 바이브코딩의 기본 개념',
    lessonNumber: 9,
    title: '바이브코딩 개념과 3단계 사이클 (요구사항 &rarr; 실행 &rarr; 디버깅)',
    time: '15분',
    level: '핵심',
    objectives: [
      '전통적 코딩 암기 방식과 자연어 중심의 바이브코딩(Vibe Coding) 패러다임 차이를 이해한다.',
      '요구사항 정의(Prompting) &rarr; 즉각 실행(Preview) &rarr; 대화형 디버깅(Refining) 3단계 사이클을 체득한다.',
      '비개발자 공무원으로서 시스템 제작의 디렉터(기획 및 검증자) 역할을 정립한다.'
    ],
    concept: `
      <p><strong>바이브코딩(Vibe Coding)</strong>이란 복잡한 프로그래밍 언어(C, Java, Python 등)의 문법을 외우지 않고, <strong>사람의 자연어 지시(Prompt)와 피드백만으로 AI와 대화하며 소프트웨어를 만드는 최신 개발 방식</strong>입니다.</p>
      <div class="info-card">
        <h4>🔄 바이브 코딩의 3단계 무한 루프 사이클</h4>
        <ol class="clean-list">
          <li><strong>1단계: 요구사항 정의 (Prompting)</strong><br>
            "어떤 화면이 필요하고, 어떤 버튼을 눌렀을 때 어떤 데이터가 계산되어야 하는지" 일상의 말로 상세히 지시합니다.</li>
          <li><strong>2단계: 즉각 실행 & 검증 (Preview)</strong><br>
            AI가 작성한 코드를 구글 AI 스튜디오 등 미리보기 창에서 직접 눌러보며 동작을 확인합니다.</li>
          <li><strong>3단계: 대화형 디버깅 (Refining)</strong><br>
            "버튼을 눌렀는데 반응이 없어. 콘솔 에러 없이 다시 계산되게 고쳐줘"처럼 AI에게 문제점을 말해주며 완성도를 높입니다.</li>
        </ol>
      </div>
      <p>공무원은 더 이상 코드를 한 줄 한 줄 칠 필요가 없습니다. <strong>"어떤 행정 문제를 해결할지 기획하고, AI가 만든 결과물이 규정에 맞게 잘 돌아가는지 검토하는 총감독(Director)"</strong>이 되는 것입니다.</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 1인 가구 실태조사 입력기 만들기',
      content: '복지정책과 송 주무관은 코딩을 전혀 몰랐지만, "조사원이 태블릿으로 방문 세대의 [연령, 난방 방식, 식사 횟수]를 체크하면 자동으로 위험도를 상/중/하로 판별해 주는 화면을 만들어줘"라고 자연어로 요청했습니다. 5번의 대화 수정 끝에 팀원들이 현장에서 쓸 수 있는 웹도구를 반나절 만에 완성했습니다.'
    },
    goodCase: `
      <strong>[바이브코딩 지시 모범 예시]</strong><br>
      "관내 출장비 계산기를 만들어줘. 화면 상단에 [관내/관외] 라디오 버튼이 있고, 관내 선택 시 왕복 4시간 이상이면 일비 2만원, 4시간 미만이면 1만원이 자동 계산되는 단일 HTML 파일을 완성해 줘."
    `,
    badCase: `
      <strong>[모호한 바이브코딩 지시]</strong><br>
      "출장비 웹사이트 하나 짜줘."
    `,
    caseReview: '규칙(4시간 기준, 금액)과 화면 요소(라디오 버튼)를 일상어로 구체화할수록 AI가 한 번에 정확한 동작 코드를 만들어냅니다.',
    miniActivity: {
      title: '3분 미니 활동: 내 책상 위 계산기 기획하기',
      instruction: '평소 엑셀이나 계산기로 반복 계산하던 업무(초과근무시간, 여비, 연가보상비 등) 중 웹 화면으로 만들고 싶은 것 1가지를 문장으로 정의해 보세요.',
      tip: '"어떤 입력을 받아서 어떤 결과를 보여줄 것인가?"에 집중하세요.'
    },
    summary3Lines: [
      '1. 바이브코딩은 코드를 암기하지 않고 자연어로 AI와 협업하여 소프트웨어를 만드는 방식입니다.',
      '2. [요구사항 정의 &rarr; 즉시 실행 확인 &rarr; 대화형 오류 수정] 3단계 사이클로 진행됩니다.',
      '3. 공무원의 역할은 프로그래머가 아니라 행정 문제를 정의하고 결과를 검증하는 기획자입니다.'
    ],
    quizIds: ['q9_1', 'q9_2', 'q9_3'],
    relatedAction: { text: '10차시: 웹 동작 원리와 공공 싱글 파일 웹앱 아키텍처', link: 'lesson_10' }
  },

  {
    id: 'lesson_10',
    week: 3,
    module: 5,
    moduleTitle: '모듈 5. 바이브코딩의 기본 개념',
    lessonNumber: 10,
    title: '웹 동작 원리와 공공 경량 싱글 파일 웹앱(Single-File App) 구조',
    time: '14분',
    level: '핵심',
    objectives: [
      '화면(HTML), 디자인(CSS), 동작(JavaScript)의 역할 분담을 직관적으로 이해한다.',
      '복잡한 서버 설치 없이 단일 `index.html` 파일로 구동되는 공공 경량 웹앱 아키텍처를 파악한다.',
      '화면에 보이는 껍데기와 데이터가 실제로 계산·저장되는 기능의 차이를 명확히 구분한다.'
    ],
    concept: `
      <p>우리가 매일 보는 인터넷 웹사이트는 대체 어떤 구조로 움직이는 걸까요? 집 짓기에 비유하면 아주 쉽습니다.</p>
      <div class="info-card">
        <h4>🏠 웹을 이루는 3총사와 행정 비유</h4>
        <ul class="clean-list">
          <li><strong>HTML (골조 & 뼈대)</strong>: 건물의 기둥과 벽. 웹페이지에서 글자, 제목, 버튼, 입력창의 <em>내용과 위치</em>를 잡습니다.</li>
          <li><strong>CSS (인테리어 & 도색)</strong>: 벽지 색상, 폰트 크기, 간격, 모바일 반응형 배치 등 <em>디자인</em>을 담당합니다.</li>
          <li><strong>JavaScript (전기 & 배관)</strong>: 스위치를 누르면 불이 켜지듯, 버튼을 눌렀을 때 <em>계산하고 화면을 바꾸는 실제 동작</em>을 수행합니다.</li>
        </ul>
      </div>
      <p>공공기관은 보안 규제상 복잡한 개발 서버나 Node.js 환경을 로컬 PC에 설치하기 어렵습니다. 따라서 초보자에게 가장 완벽한 형태는 <strong>하나의 <code>index.html</code> 파일 안에 HTML + CSS + JavaScript를 모두 담아 더블클릭만으로 실행되는 '싱글 파일 웹앱(Single-File App)'</strong>입니다.</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 내부 인트라넷용 당직 근무표 조회기 배포',
      content: '총무과 한 주무관은 직원들이 자기 당직 날짜를 쉽게 검색할 수 있는 웹페이지를 만들었습니다. 복잡한 서버 승인을 받을 필요 없이, 단 1개의 dangjik.html 파일을 공용 폴더에 올려두어 모든 직원이 브라우저로 열어볼 수 있게 배포했습니다.'
    },
    goodCase: `
      <strong>[싱글 파일 웹앱 요청 프롬프트 예시]</strong><br>
      "별도의 빌드 도구나 외부 서버 설치 없이, 브라우저에서 파일 더블클릭만으로 완벽히 작동하는 단일 'index.html' 파일로 만들어 줘. 디자인은 Tailwind CSS CDN을 사용하고, 동작 로직은 순수 자바스크립트로 내장해 줘."
    `,
    badCase: `
      <strong>[불필요하게 복잡한 개발 환경 요청]</strong><br>
      "리액트랑 노드제이에스로 백엔드 서버 구축해 줘." (공무원 사내 PC에서는 설치조차 차단됨)
    `,
    caseReview: '비개발자 행정 실무에서는 외부 종속성이 없고 유지보수가 쉬운 단일 파일(Standalone Single File) 구조가 가장 실용적입니다.',
    miniActivity: {
      title: '3분 미니 활동: 웹페이지 요소 분해해 보기',
      instruction: '지금 보고 계신 이 화면에서 [글자 내용(HTML) - 파란색 버튼 디자인(CSS) - 클릭 시 탭이 바뀌는 반응(JS)]을 눈으로 찾아보세요.',
      tip: '겉모습과 실제 동작 로직을 구분하는 눈을 갖는 것이 바이브코딩의 시작입니다.'
    },
    summary3Lines: [
      '1. 웹은 뼈대(HTML), 디자인(CSS), 동작(JavaScript)의 세 가지 요소가 결합해 동작합니다.',
      '2. 화면에 버튼이 예쁘게 그려진 것(UI)과 버튼을 눌렀을 때 실제 계산되는 것(Logic)은 다릅니다.',
      '3. 공공 실무에서는 설치가 필요 없는 경량 단일 파일(Single-File App) 아키텍처가 가장 적합합니다.'
    ],
    quizIds: ['q10_1', 'q10_2', 'q10_3'],
    relatedAction: { text: '11차시: Google AI Studio 실습 환경 구축 및 Build 모드', link: 'lesson_11' }
  },

  {
    id: 'lesson_11',
    week: 3,
    module: 6,
    moduleTitle: '모듈 6. 제작 도구와 작업 흐름',
    lessonNumber: 11,
    title: 'Google AI Studio 실습 환경 구축 및 Build 모드 활용법',
    time: '15분',
    level: '실습',
    objectives: [
      '무료로 강력한 제미나이(Gemini) 모델을 실습할 수 있는 Google AI Studio 환경에 접속한다.',
      'Build 모드(또는 프롬프트 엔지니어링 창)에서 요구사항을 입력하고 즉시 실행 결과를 확인한다.',
      '시스템 프롬프트(System Instruction)를 활용해 웹앱 제작 가이드라인을 강제한다.'
    ],
    concept: `
      <p>공무원이 실무 웹앱을 만들 때 가장 안전하고 편리한 무료 도구가 바로 <strong>Google AI Studio(aistudio.google.com)</strong>입니다.</p>
      <div class="info-card">
        <h4>🛠️ Google AI Studio가 공공 실습에 최고인 4가지 이유</h4>
        <ul class="clean-list">
          <li><strong>1. 완전 무료 토큰 제공</strong>: 유료 결제 없이도 Google 계정만 있으면 최신 고성능 제미나이 모델을 충분히 활용 가능합니다.</li>
          <li><strong>2. 원클릭 실행 & 미리보기</strong>: 프롬프트로 웹 코드를 요청하면 화면 안에서 즉시 웹앱을 구동해 볼 수 있습니다.</li>
          <li><strong>3. System Instruction(시스템 지침)</strong>: "너는 공공 웹 개발자다. 무조건 단일 HTML로 작성하라"는 원칙을 고정해 둘 수 있습니다.</li>
          <li><strong>4. 안전한 프로토타이핑</strong>: 내 PC에 프로그램을 설치하지 않고 브라우저 탭 하나로 완결됩니다.</li>
        </ul>
      </div>
      <p>우리 러닝랩의 <em>[프롬프트 실습실]</em>에서 완성된 프롬프트를 복사한 뒤, Google AI Studio에 붙여넣기만 하면 1분 만에 작동하는 웹도구가 눈앞에 펼쳐집니다.</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 민원 안내 챗봇 프로토타입 10분 완성',
      content: '민원봉사과 조 주무관은 Google AI Studio에 접속하여 시스템 지침에 "지자체 여권 발급 안내 전담 상담관 페르소나"를 입력하고 예시 질문-답변을 넣었습니다. 곧바로 화면 우측 미리보기 창에서 실제 주민과 대화하듯 여권 수수료와 준비물을 안내하는 프로토타입을 시연해 부서 회의에서 호평을 받았습니다.'
    },
    goodCase: `
      <strong>[AI Studio 시스템 프롬프트(System Instruction) 권장 설정]</strong><br>
      "너는 공공기관용 단일 페이지 인터랙티브 웹앱을 전문으로 만드는 시니어 풀스택 개발자야. 모든 응답은 외부 의존성 없이 index.html 파일 하나로 완전히 동작해야 하며, 한글 인코딩(UTF-8)과 모바일 반응형(Tailwind CSS)을 기본으로 적용해 줘."
    `,
    badCase: `
      <strong>[지침 없이 일반 대화로 요청]</strong><br>
      "웹사이트 만들어줘." (AI가 파이썬 서버 코드나 분할된 파일들을 주어 초보자가 실행하지 못함)
    `,
    caseReview: '시스템 지침(System Instruction)을 통해 "단일 파일 완성형"을 규정해 두면 오류 없는 완성 코드가 출력됩니다.',
    miniActivity: {
      title: '3분 미니 활동: AI Studio 북마크 추가하기',
      instruction: '웹 브라우저의 새 탭을 열고 https://aistudio.google.com/ 에 접속하여 즐겨찾기(북마크)에 등록해 보세요.',
      tip: '우리 연구동아리 실습의 메인 실험실이 될 공간입니다.'
    },
    summary3Lines: [
      '1. Google AI Studio는 설치 없이 무료로 최신 AI 웹앱을 프로토타이핑할 수 있는 도구입니다.',
      '2. System Instruction에 "단일 HTML 파일 제작" 규칙을 등록해 두면 실패 확률이 급감합니다.',
      '3. 프롬프트 복사 &rarr; AI Studio 붙여넣기 &rarr; 즉시 미리보기 3단계 흐름을 익혀두세요.'
    ],
    quizIds: ['q11_1', 'q11_2', 'q11_3'],
    relatedAction: { text: '12차시: 도구별 특성(v0, Cursor 등)과 버전 관리 기초', link: 'lesson_12' }
  },

  {
    id: 'lesson_12',
    week: 3,
    module: 6,
    moduleTitle: '모듈 6. 제작 도구와 작업 흐름',
    lessonNumber: 12,
    title: '도구별 특성(v0, Cursor, VS Code)과 버전 관리(GitHub) 기초',
    time: '13분',
    level: '기초',
    objectives: [
      '목적에 따라 AI 도구(AI Studio, v0.dev, Cursor, VS Code)를 똑똑하게 구분하여 선택한다.',
      '소프트웨어 변경 이력을 기록하고 과거 시점으로 되돌리는 버전 관리(Git/GitHub)의 필요성을 이해한다.',
      '지금 당장 쓸 도구와 나중에 단계적으로 배울 도구의 우선순위를 정립한다.'
    ],
    concept: `
      <p>바이브코딩의 세계에는 다양한 전문 도구들이 있습니다. 하지만 초보자가 모든 도구를 처음부터 설치할 필요는 전혀 없습니다!</p>
      <div class="info-card">
        <h4>🧰 지금 쓸 도구 vs 나중에 배울 도구 한눈에 보기</h4>
        <ul class="clean-list">
          <li><strong>Google AI Studio (지금 즉시 필수!)</strong>: 무료 웹 기반. 아이디어를 즉시 단일 웹앱으로 구현할 때 최고의 도구.</li>
          <li><strong>v0.dev / Lovable (디자인 심화)</strong>: 감각적인 공공 대시보드나 세련된 모바일 UI 컴포넌트를 시각적으로 뚝딱 뽑아낼 때 유용.</li>
          <li><strong>VS Code / Cursor (로컬 심화)</strong>: 내 컴퓨터에 소스코드를 저장하고 파이썬 자동화 스크립트나 대규모 사이트를 다듬을 때 페어 코딩 파트너.</li>
          <li><strong>GitHub (버전 관리 & 무료 배포)</strong>: "작년 버전", "어제 수정한 버전" 등 변경 이력을 보관하고 웹사이트를 전 세계에 무료로 띄워주는 저장소.</li>
        </ul>
      </div>
      <p>초보자 단계에서는 <strong>"AI Studio에서 단일 HTML 파일 만들기"</strong> 하나만 완벽히 마스터해도 청내 행정 혁신을 선도할 수 있습니다.</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 동아리 프로젝트 소스코드 백업',
      content: '연구동아리 총무를 맡은 백 주무관은 회원들이 만든 출장비 계산기, 행사 큐시트 생성기 등의 단일 HTML 파일들을 GitHub 저장소에 업로드했습니다. 별도 서버 비용 없이 GitHub Pages 기능을 통해 무료로 인터넷 주소(URL)를 발급받아 동아리원들과 공유했습니다.'
    },
    goodCase: `
      <strong>[단계적 도구 학습 전략]</strong><br>
      "1단계: Google AI Studio로 단일 HTML 웹앱 완성 &rarr; 2단계: 코드가 길어지면 VS Code로 코드 열어보기 &rarr; 3단계: 완성된 코드를 GitHub에 업로드해 무료 배포 링크 얻기"
    `,
    badCase: `
      <strong>[첫날부터 도구 과부하]</strong><br>
      "Node.js, Git, 도커, 리액트 환경부터 사내 PC에 설치하려다 보안 프로그램에 막혀 코딩 포기."
    `,
    caseReview: '자신의 현재 역량과 사내 보안 환경에 맞는 가벼운 도구부터 시작하는 것이 완주의 지름길입니다.',
    miniActivity: {
      title: '3분 미니 활동: 내게 필요한 다음 도구 찜하기',
      instruction: '도구 카드 중 "Google AI Studio 다음에 내가 가장 호기심이 생기는 도구" 1가지를 골라보세요.',
      tip: '시각적 디자인이 좋다면 v0.dev, 내 PC에서 코드를 만지고 싶다면 VS Code가 좋습니다.'
    },
    summary3Lines: [
      '1. 초보자는 설치가 필요 없는 Google AI Studio 하나로 먼저 성공 경험을 쌓으세요.',
      '2. 버전 관리(GitHub)는 파일명 뒤에 [최종_진짜최종.hwp]를 붙이지 않고 이력을 보존하는 시스템입니다.',
      '3. 모든 도구를 한 번에 배울 필요 없이 단계적으로 필요한 순간에 확장해 나가면 됩니다.'
    ],
    quizIds: ['q12_1', 'q12_2', 'q12_3'],
    relatedAction: { text: '4주차 진입: 13차시 웹사이트 제작 프롬프트 구조화 기법', link: 'lesson_13' }
  },

  // ================= 4주차: 프롬프트로 웹사이트 제작하기 =================
  {
    id: 'lesson_13',
    week: 4,
    module: 7,
    moduleTitle: '모듈 7. 웹사이트 제작 프롬프트',
    lessonNumber: 13,
    title: '웹사이트 제작을 위한 시스템/구조화 프롬프트 작성법',
    time: '15분',
    level: '핵심',
    objectives: [
      '단순 질문용 프롬프트와 소프트웨어 제작용 시스템 프롬프트의 차이를 체득한다.',
      '목적, 사용자, 화면, 핵심 기능, 데이터 저장 방식, 디자인 톤의 6대 명세서를 작성한다.',
      '우리 사이트 [프롬프트 실습실]의 10단계 마법사를 100% 활용하는 법을 익힌다.'
    ],
    concept: `
      <p>웹사이트를 만들어달라고 할 때 가장 흔한 실패는 <em>"민원 사이트 하나 만들어줘"</em>라고 한 줄만 적는 것입니다. AI는 사용자가 말하지 않은 것을 임의로 상상해서 채우기 때문입니다.</p>
      <div class="info-card">
        <h4>🏗️ 웹앱 제작을 위한 6대 필수 명세 (Specification)</h4>
        <ol class="clean-list">
          <li><strong>서비스 목적 & 사용자</strong>: "누가, 무슨 불편을 겪어서, 어떤 목표로 쓰는가?"</li>
          <li><strong>화면 레이아웃</strong>: "상단 헤더, 좌측 사이드바, 중앙 입력창, 우측 결과 카드"</li>
          <li><strong>핵심 기능 3~5개</strong>: "1) 관내/관외 선택, 2) 시간 계산, 3) 품의문 텍스트 복사 버튼"</li>
          <li><strong>데이터 저장 방식</strong>: "저장 안 함 / 현재 브라우저(localStorage) 보관 / 다자간 공유"</li>
          <li><strong>디자인 기준</strong>: "공공기관 신뢰감을 주는 네이비/청록색 톤, 깔끔한 카드 UI"</li>
          <li><strong>예시 데이터 & 완료 조건</strong>: "화면이 열렸을 때 기본 예시 3개가 채워져 있을 것"</li>
        </ol>
      </div>
      <p>이 6가지 명세를 갖춘 프롬프트를 <strong>'구조화 프롬프트(Structured Prompt)'</strong>라고 부릅니다. 우리 사이트의 <em>[프롬프트 실습실]</em>이 이 과정을 자동으로 완성해 드립니다.</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 당직 일지 입력 웹도구 제작',
      content: '운영지원과 서 주무관은 [프롬프트 실습실]에서 10가지 입력창(목적: 야간 순찰 결과 기록, 사용자: 일직/숙직 공무원, 기능: 시간별 순찰 체크, 저장: 브라우저 로컬스토리지, 디자인: 야간용 다크모드 지원)을 채워 생성된 프롬프트를 AI Studio에 붙여넣었습니다. 단 한 번의 실행으로 완벽한 당직 일지 웹앱이 완성되었습니다.'
    },
    goodCase: `
      <strong>[완벽한 구조화 프롬프트 예시]</strong><br>
      "너는 공공 웹앱 전문 풀스택 개발자야. 『공무원 여비 자동 계산기』를 단일 index.html로 만들어줘.<br>
      - 사용자: 출장 품의를 올리는 지자체 직원<br>
      - 핵심기능: 관내/관외 구분, 시간별 일비(4시간 이상 2만원, 미만 1만원), 식비 1식당 9천원 합산<br>
      - 부가기능: '결재 상신용 문구 생성' 버튼 누르면 클립보드에 자동 복사<br>
      - 스타일: Tailwind CSS 기반 단정한 공공 스타일, 모바일 완벽 지원"
    `,
    badCase: `
      <strong>[두루뭉술한 프롬프트]</strong><br>
      "출장비 계산하는 홈페이지 코드 줘."
    `,
    caseReview: '규칙과 버튼 동작이 정의되지 않으면 AI가 출장비 기준을 지어내거나 복사 버튼 없는 단순 페이지만 만듭니다.',
    miniActivity: {
      title: '3분 미니 활동: 프롬프트 실습실 10문항 훑어보기',
      instruction: '우리 사이트 좌측 메뉴의 [프롬프트 실습실] 탭을 열어보고, 어떤 항목들이 준비되어 있는지 1분간 둘러보세요.',
      tip: '각 입력란 아래의 친절한 힌트와 예시 문구를 참고하면 쉽게 채울 수 있습니다.'
    },
    summary3Lines: [
      '1. 웹앱 제작 프롬프트는 화면, 기능, 데이터, 디자인이 포함된 설계 도면이어야 합니다.',
      '2. 브라우저 저장(localStorage) 방식을 지정해야 새로고침해도 데이터가 날아가지 않습니다.',
      '3. 프롬프트 실습실의 10단계 마법사를 이용하면 초보자도 완벽한 구조화 프롬프트를 만들 수 있습니다.'
    ],
    quizIds: ['q13_1', 'q13_2', 'q13_3'],
    relatedAction: { text: '14차시: 반복적 개선(Iterative)과 오류 수정 디버깅 프롬프트', link: 'lesson_14' }
  },

  {
    id: 'lesson_14',
    week: 4,
    module: 7,
    moduleTitle: '모듈 7. 웹사이트 제작 프롬프트',
    lessonNumber: 14,
    title: '반복적 개선(Iterative Prompting)과 오류 수정 디버깅 패턴',
    time: '14분',
    level: '실습',
    objectives: [
      'AI가 만들어 준 첫 결과물이 불완전할 때 당황하지 않고 대화로 교정하는 태도를 갖춘다.',
      '버튼 무반응, 데이터 증발, 디자인 깨짐 등 5대 빈출 오류별 디버깅 프롬프트 공식을 익힌다.',
      '오류 현상을 육하원칙(화면-행동-기대-실제-에러)으로 AI에 전달하는 기술을 체득한다.'
    ],
    concept: `
      <p>바이브코딩의 진정한 묘미는 <strong>'첫술에 완벽을 바라지 않고, 대화로 고쳐나가는 디버깅(Debugging)'</strong>에 있습니다.</p>
      <div class="info-card">
        <h4>🚨 5대 빈출 오류와 마법의 해결 프롬프트 공식</h4>
        <ul class="clean-list">
          <li><strong>1. 버튼을 눌러도 아무 반응이 없을 때</strong><br>
            "브라우저 개발자도구(F12) 콘솔 에러가 없도록 자바스크립트 이벤트 리스너(addEventListener) 로직을 점검하고, 클릭 시 alert나 화면 결과가 즉시 뜨도록 수정해 줘."</li>
          <li><strong>2. 새로고침(F5)을 누르면 기껏 입력한 데이터가 다 날아갈 때</strong><br>
            "입력된 데이터를 브라우저의 localStorage에 자동 저장하고, 페이지가 열릴 때 이전 저장 데이터를 불러와 화면에 복원하도록 고쳐줘."</li>
          <li><strong>3. 스마트폰 화면에서 글자가 겹치거나 가로 스크롤이 생길 때</strong><br>
            "모바일 화면에서도 글자 겹침 없이 세로 1열로 깔끔하게 떨어지도록 반응형 flex/grid 클래스를 조정해 줘."</li>
          <li><strong>4. 글자가 너무 작고 줄 간격이 좁아 답답할 때</strong><br>
            "본문 기본 폰트 크기를 16px 이상으로 키우고 줄 간격(line-height: 1.7)을 넉넉히 주어 가독성을 높여줘."</li>
        </ul>
      </div>
      <p>오류를 설명할 때는 <em>"어떤 버튼을 눌렀을 때(행동) &rarr; 원래는 합계가 나와야 하는데(기대) &rarr; 지금은 아무것도 안 떠(실제)"</em> 순으로 설명하면 AI가 1초 만에 원인을 짚어냅니다.</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 출장비 계산기 복사 버튼 오류 해결',
      content: '권 주무관은 AI Studio에서 출장비 계산기를 만들었으나 "문구 복사" 버튼을 눌러도 반응이 없었습니다. 당황하지 않고 "버튼 클릭 시 navigator.clipboard.writeText가 정상 실행되도록 수정하고, 복사 성공 시 화면 상단에 [클립보드에 복사되었습니다] 토스트 알림을 띄워줘"라고 후속 프롬프트를 입력해 완벽히 고쳤습니다.'
    },
    goodCase: `
      <strong>[5단계 오류 제보 모범 프롬프트]</strong><br>
      "[화면] 출장비 자동 계산 화면<br>
      [행동] '계산하기' 파란색 버튼을 클릭함<br>
      [기대결과] 하단에 총 출장비 30,000원이 표시되어야 함<br>
      [실제결과] 아무런 텍스트도 나타나지 않음<br>
      [요청] 콘솔 에러를 해결하고, 값이 비어있을 때는 '시간을 입력해주세요' 경고창을 띄우도록 수정해 줘."
    `,
    badCase: `
      <strong>[감정적이고 모호한 불평]</strong><br>
      "이거 왜 안 돼요? 다시 만들어줘요."
    `,
    caseReview: '무엇이 어떻게 안 되는지 구체적 현상을 알려주어야 AI가 기존 코드의 장점을 유지하면서 문제 부위만 정확히 수술합니다.',
    miniActivity: {
      title: '3분 미니 활동: 오류 설명 연습해 보기',
      instruction: '우리 동아리 웹사이트의 [프롬프트 실습실 &rarr; 상황별 수정 프롬프트] 탭을 열어 5가지 대응 문장을 확인해 보세요.',
      tip: '복사 버튼 한 번으로 실습에 바로 쓸 수 있게 준비되어 있습니다.'
    },
    summary3Lines: [
      '1. 첫 번째 생성 결과에 오류가 있는 것은 지극히 자연스러운 개발 과정입니다.',
      '2. [발생 화면 &rarr; 수행 행동 &rarr; 기대 결과 &rarr; 실제 현상] 4단계로 오류를 설명하세요.',
      '3. 데이터 유지는 localStorage, 모바일 깨짐은 반응형 클래스 요청으로 손쉽게 해결됩니다.'
    ],
    quizIds: ['q14_1', 'q14_2', 'q14_3'],
    relatedAction: { text: '15차시: 실전 행정 웹도구 제작 실습과 인터랙션 점검', link: 'lesson_15' }
  },

  {
    id: 'lesson_15',
    week: 4,
    module: 8,
    moduleTitle: '모듈 8. 나만의 행정업무 도구 완성하기',
    lessonNumber: 15,
    title: '실전 행정 웹도구 제작 실습과 인터랙션/모바일 점검',
    time: '15분',
    level: '실습',
    objectives: [
      '우리 사이트의 [만들기 미션] 4종 중 1개를 선택하여 실제 AI Studio에서 제작을 완수한다.',
      '빈 값 입력 시 오류 방지(Validation), 중복 클릭 방지 등 공공 인터랙션을 점검한다.',
      'PC 모니터뿐 아니라 스마트폰 화면에서도 가로 스크롤 없이 부드럽게 동작하는지 검증한다.'
    ],
    concept: `
      <p>드디어 직접 나만의 행정 도구를 세상에 탄생시킬 시간입니다! 우리 러닝랩에서는 <strong>4개의 단계별 실전 미션</strong>을 제공합니다.</p>
      <div class="info-card">
        <h4>🎯 수준별 실전 만들기 미션 라인업</h4>
        <ol class="clean-list">
          <li><strong>미션 1. 우리 연구동아리 소개 사이트 (입문)</strong>: 동아리 소개, 학습 주제, 활동 일정, FAQ가 담긴 깔끔한 랜딩 페이지</li>
          <li><strong>미션 2. 행정업무 체크리스트 (기초)</strong>: 할 일 추가/수정/삭제/완료 체크 및 새로고침 후에도 유지되는 스마트 업무 수첩</li>
          <li><strong>미션 3. AI 기초 퀴즈 웹사이트 (기초~중급)</strong>: 문제 풀이, 즉각 채점, 점수 합산, 오답 해설 및 다시 풀기 기능</li>
          <li><strong>선택 미션. 나의 행정혁신 아이디어 웹앱 (자유)</strong>: 출장비 계산기, 보도자료 스튜디오 등 내 부서 현안을 해결하는 맞춤 도구</li>
        </ol>
      </div>
      <p>제작을 마친 뒤에는 <em>1) 빈칸 입력 시 안내 문구가 뜨는지, 2) 모바일에서 버튼이 잘 눌리는지, 3) 새로고침해도 데이터가 살아있는지</em> 3대 필수 요소를 자가 점검합니다.</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 민원실 주차권 발급 도구 자체 제작',
      content: '민원여권과 하 주무관은 미션 2(체크리스트) 프롬프트를 응용하여 "민원인 방문 차량 번호와 출차 시간을 입력하면 1시간 무료 주차 바코드를 화면에 띄워주는 간이 웹앱"을 만들었습니다. 주차 관리실과의 전화 확인 절차가 사라져 하루 40분의 시간을 아꼈습니다.'
    },
    goodCase: `
      <strong>[완료 자가 점검 체크리스트 활용 예시]</strong><br>
      "미션 2 완성 후 자가 테스트 수행:<br>
      - [x] 할 일 항목에 아무것도 입력하지 않고 '추가' 버튼을 눌렀을 때 경고 메시지가 뜨는가?<br>
      - [x] 완료 체크박스를 눌렀을 때 취소선이 정상적으로 그어지는가?<br>
      - [x] F5 새로고침 후에도 이전에 등록한 업무 3개가 유지되는가?"
    `,
    badCase: `
      <strong>[화면만 보고 끝내는 경우]</strong><br>
      "화면에 예쁘게 나왔으니 다 된 줄 알고 버튼 테스트 없이 종료함."
    `,
    caseReview: '사용자 인터랙션(버튼 클릭, 예외 입력)을 직접 눌러보고 확인해야 실제 업무에 투입할 수 있는 소프트웨어가 됩니다.',
    miniActivity: {
      title: '3분 미니 활동: 나만의 첫 미션 결정하기',
      instruction: '우리 사이트 메뉴의 [만들기 미션]으로 이동하여 미션 1, 2, 3 중 오늘 내가 도전할 미션 1개를 마음속으로 찜해보세요.',
      tip: '처음이라면 [미션 1. 연구동아리 소개 사이트]를 가장 추천합니다.'
    },
    summary3Lines: [
      '1. 입문자를 위한 동아리 소개 사이트부터 실무 체크리스트, 퀴즈 앱까지 단계별 미션이 준비되어 있습니다.',
      '2. 빈 값 입력 방지, 버튼 중복 클릭 방지 등 예외 처리가 들어갔는지 확인하세요.',
      '3. 스마트폰 모바일 뷰에서도 가로 스크롤 없이 시원하게 보이는지 검증하세요.'
    ],
    quizIds: ['q15_1', 'q15_2', 'q15_3'],
    relatedAction: { text: '16차시: 데이터 로컬 저장, 배포/공유 및 프로젝트 회고', link: 'lesson_16' }
  },

  {
    id: 'lesson_16',
    week: 4,
    module: 8,
    moduleTitle: '모듈 8. 나만의 행정업무 도구 완성하기',
    lessonNumber: 16,
    title: '데이터 로컬 저장, 배포와 공유의 기본 개념 및 프로젝트 결과 회고',
    time: '15분',
    level: '완성',
    objectives: [
      '브라우저 단독 저장(localStorage)과 다자간 공유(서버/DB)의 기술적 경계와 차이를 이해한다.',
      '완성된 웹앱의 결과 링크(URL) 또는 실행 화면을 동아리 동료들과 안전하게 공유하는 방식을 익힌다.',
      '배운 점, 어려웠던 점, 향후 개선점을 기록하는 3단 회고(Retrospective)를 작성하고 과정을 완주한다.'
    ],
    concept: `
      <p>축하합니다! 4주간의 모든 과정을 거쳐 드디어 최종 16차시에 도달하셨습니다. 마지막으로 꼭 기억해야 할 것은 <strong>'데이터 저장의 진실'</strong>입니다.</p>
      <div class="info-card">
        <h4>💾 브라우저 저장 vs 다자간 공유의 차이</h4>
        <ul class="clean-list">
          <li><strong>현재 브라우저 저장 (localStorage)</strong>: 지금 내가 쓰는 컴퓨터의 크롬 브라우저 안에만 보관됩니다. 인터넷 연결 없이도 안전하지만, 옆자리 동료 컴퓨터에서는 보이지 않습니다. (개인용 도구에 최적)</li>
          <li><strong>다자간 실시간 공유 (서버 & 데이터베이스)</strong>: 모든 직원이 동시에 같은 데이터를 보고 수정하려면 Firebase, Supabase 같은 클라우드 데이터베이스와 로그인(인증) 시스템이 필요합니다. (심화 확장 영역)</li>
        </ul>
      </div>
      <p>현재 단계에서는 브라우저 저장만으로도 개인 업무 생산성을 200% 끌어올릴 수 있습니다. 이제 [만들기 미션]에서 실습 결과와 함께 <strong>3단 회고(배운 점, 어려웠던 점, 다음 개선점)</strong>를 남기고 대망의 <em>'과정 완주 배지'</em>를 획득해 보세요!</p>
    `,
    adminCase: {
      title: '가상의 행정 사례: 동아리 성과 발표회 및 회고 공유',
      content: '스마트 행정혁신 연구동아리는 연말 성과공유회에서 16개 차시를 완주한 회원 12명의 자체 개발 웹도구 전시회를 열었습니다. 각자의 회고록을 공유하며 "코딩 문법을 몰라도 업무에 대한 열정과 바이브코딩 프롬프트만 있으면 누구나 행정 혁신가가 될 수 있다"는 확신을 확인했습니다.'
    },
    goodCase: `
      <strong>[성장을 이끄는 3단 회고 작성 예시]</strong><br>
      - <strong>배운 점</strong>: "AI에게 명확한 역할과 제약조건(TCREI)을 주면 완벽한 단일 HTML 코드가 나온다는 것을 알게 됨."<br>
      - <strong>어려웠던 점</strong>: "출장비 계산 시 4시간 기준 조건을 프롬프트에 빠뜨려 처음엔 계산이 안 맞았으나, 후속 대화로 해결함."<br>
      - <strong>다음 개선점</strong>: "다음번엔 관외 출장 숙박비까지 계산할 수 있도록 입력 항목을 확장해 볼 계획임."
    `,
    badCase: `
      <strong>[무의미한 회고]</strong><br>
      "재미있었다. 끝."
    `,
    caseReview: '시행착오와 다음 개선점을 기록해 둘 때 진정한 나만의 디지털 역량으로 축적됩니다.',
    miniActivity: {
      title: '3분 미니 활동: 완주 배지 수여식 준비',
      instruction: '우리 사이트 메뉴의 [나의 학습] 탭을 클릭하여, 지금까지 내가 모은 경험치(XP)와 레벨, 획득한 배지들을 확인해 보세요.',
      tip: 'JSON 내보내기 버튼으로 나의 소중한 학습 데이터를 컴퓨터에 파일로 보관할 수도 있습니다.'
    },
    summary3Lines: [
      '1. 현재 브라우저 저장은 개인용으로 안전하며, 다자간 동시 공유는 서버/DB 확장이 필요합니다.',
      '2. [배운 점, 어려웠던 점, 다음 개선점] 3단 회고는 성장을 증명하는 최고의 자산입니다.',
      '3. 16개 차시를 완주한 여러분은 이제 당당한 공공행정 바이브 메이커입니다!'
    ],
    quizIds: ['q16_1', 'q16_2', 'q16_3'],
    relatedAction: { text: '나의 학습 대시보드로 이동하여 완주 기록 확인하기', link: 'my-learning' }
  }
];



/* ==========================================================================
 * [모듈 로드] data/quizData.js
 * ========================================================================== */

/**
 * 스마트 행정혁신 AI 러닝랩 - 48개 복습 퀴즈 데이터베이스
 * 
 * [초보자 설명]
 * 이 파일은 16개 차시(차시당 3문제)에 대응하는 총 48개의 퀴즈 풀입니다.
 * 4지선다형, OX형, 공공행정 업무 상황 판단형으로 구성되어 있으며,
 * 각 문제마다 명확한 정답과 상세 해설, 오답인 이유가 충실히 수록되어 있습니다.
 */

const QUIZ_DATA = [
  // ================= 1차시 퀴즈 (q1_1 ~ q1_3) =================
  {
    id: 'q1_1',
    lessonId: 'lesson_1',
    type: 'multiple_choice',
    question: '다음 중 인공지능(AI)의 세부 분야 간의 개념적 포함 관계를 가장 올바르게 나타낸 것은?',
    options: [
      '인공지능(AI) ⊃ 생성형 AI ⊃ 대규모 언어모델(LLM)',
      '대규모 언어모델(LLM) ⊃ 생성형 AI ⊃ 인공지능(AI)',
      '생성형 AI ⊃ 인공지능(AI) ⊃ 대규모 언어모델(LLM)',
      '인공지능(AI)과 생성형 AI는 완전히 별개의 기술 체계이다.'
    ],
    correctIndex: 0,
    explanation: '인공지능(AI)은 인간의 지능을 모방하는 기술 전체를 뜻하는 가장 큰 범주이며, 그 안에서 새로운 콘텐츠를 생성하는 분야가 생성형 AI이고, 언어를 전문적으로 처리하는 초거대 모델이 LLM입니다.',
    wrongExplanations: [
      '정답입니다! 올바른 계층 구조입니다.',
      '오답입니다. LLM은 AI의 세부 모델 중 하나입니다.',
      '오답입니다. 생성형 AI가 AI 전체를 포함할 수는 없습니다.',
      '오답입니다. 생성형 AI는 인공지능의 핵심 하위 영역입니다.'
    ]
  },
  {
    id: 'q1_2',
    lessonId: 'lesson_1',
    type: 'ox',
    question: '[OX 퀴즈] 생성형 AI는 기존 업무 문서를 학습하여 새로운 문맥의 공지문이나 요약 보고서를 스스로 작성할 수 있다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 0,
    explanation: '생성형 AI는 기존 데이터의 규칙과 언어 패턴을 학습하여 주어진 요청에 맞게 완전히 새로운 문장과 문서를 생성할 수 있습니다.',
    wrongExplanations: [
      '정답입니다! 생성형 AI의 핵심 특성입니다.',
      '오답입니다. 생성형 AI는 단순 검색을 넘어 새로운 텍스트를 생성합니다.'
    ]
  },
  {
    id: 'q1_3',
    lessonId: 'lesson_1',
    type: 'scenario',
    question: '[상황 판단] 김 주무관이 AI에게 주민자치 프로그램 안내문 초안을 작성하게 하려 한다. 가장 바람직한 행동은?',
    options: [
      '"안내문 잘 써줘"라고 5글자만 입력하고 결과를 그대로 공문으로 기안한다.',
      '모집 인원, 신청 기간, 접수 방법 등 핵심 정보와 원하는 어조를 구체적으로 제시하고, 나온 초안을 검토한다.',
      'AI가 알아서 최신 구청 방침을 파악했을 것이라 믿고 결재를 상신한다.',
      '프로그램 신청자 명단(주민등록번호, 전화번호 포함)을 프롬프트에 통째로 붙여넣는다.'
    ],
    correctIndex: 1,
    explanation: 'AI에게는 육하원칙에 맞춘 구체적인 입력값과 어조를 주어야 하며, 생성된 초안은 반드시 공무원이 직접 검토하고 다듬어야 합니다.',
    wrongExplanations: [
      '오답입니다. 정보가 부족하면 엉뚱한 내용이 나옵니다.',
      '정답입니다! 구체적인 입력과 최종 검토가 공직자의 올바른 자세입니다.',
      '오답입니다. AI는 최신 내부 방침을 알지 못할 수 있습니다.',
      '오답입니다. 개인정보 유출로 엄격한 징계 대상이 됩니다.'
    ]
  },

  // ================= 2차시 퀴즈 (q2_1 ~ q2_3) =================
  {
    id: 'q2_1',
    lessonId: 'lesson_2',
    type: 'multiple_choice',
    question: '생성형 AI가 사실이 아닌 정보를 마치 실제인 것처럼 매우 그럴듯하게 꾸며내어 답변하는 현상을 무엇이라 하는가?',
    options: ['딥러닝(Deep Learning)', '환각 현상(Hallucination)', '오버피팅(Overfitting)', '데이터 마이닝(Data Mining)'],
    correctIndex: 1,
    explanation: 'LLM이 통계적 확률에 따라 말을 짓다 보니 실제 존재하지 않는 법 조항이나 가짜 사실을 사실처럼 말하는 것을 환각(Hallucination) 현상이라 합니다.',
    wrongExplanations: [
      '오답입니다. 딥러닝은 인공신경망 학습 기술 방식입니다.',
      '정답입니다! 환각(Hallucination)을 경계해야 합니다.',
      '오답입니다. 오버피팅은 기계학습 모델의 과적합 현상입니다.',
      '오답입니다. 데이터 마이닝은 데이터 분석 기법입니다.'
    ]
  },
  {
    id: 'q2_2',
    lessonId: 'lesson_2',
    type: 'scenario',
    question: '[상황 판단] AI가 작성한 정책 안내문에 지원금 지급일이 "매월 15일"로 명시되어 있다. 가장 적절한 다음 행동은?',
    options: [
      'AI가 날짜까지 명확히 적어주었으니 그대로 홈페이지에 팝업 공지한다.',
      '소속 부서의 공식 사업계획서나 지자체 조례를 직접 열어 실제 지급일과 일치하는지 대조(Cross-check)한다.',
      '동료 직원에게 지급일이 맞는지 전화로 물어보고 대충 올린다.',
      'AI에게 "이거 정말 맞니?"라고 한 번 더 묻고 맞다고 하면 그대로 믿는다.'
    ],
    correctIndex: 1,
    explanation: '숫자, 날짜, 금액, 법령은 환각이 발생하기 쉬운 대표 항목이므로 공식 공문서 및 규정과 반드시 교차 검증해야 합니다.',
    wrongExplanations: [
      '오답입니다. 잘못된 일자 공지로 대규모 민원 혼란이 생깁니다.',
      '정답입니다! 공식 사업계획서와의 1:1 대조가 필수입니다.',
      '오답입니다. 구두 확인보다는 공식 문서 근거 확인이 필요합니다.',
      '오답입니다. 환각을 일으킨 AI는 재차 질문해도 지어낸 답을 사실인 양 반복할 수 있습니다.'
    ]
  },
  {
    id: 'q2_3',
    lessonId: 'lesson_2',
    type: 'ox',
    question: '[OX 퀴즈] 생성형 AI는 복잡한 수치 계산이나 회계 결산 검증보다, 긴 보고서의 문맥 요약이나 어조 변환 작업에 훨씬 더 강점을 보인다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 0,
    explanation: 'LLM은 언어적 패턴과 문맥 파악에 특화되어 있어 텍스트 요약과 어조 변환에 뛰어나며, 정밀한 회계 계산은 별도의 계산기나 검증이 필요합니다.',
    wrongExplanations: [
      '정답입니다! LLM의 본질적 특성을 잘 이해하고 계십니다.',
      '오답입니다. LLM은 수치 계산기보다 언어 요약 도구로서 훨씬 신뢰도가 높습니다.'
    ]
  },

  // ================= 3차시 퀴즈 (q3_1 ~ q3_3) =================
  {
    id: 'q3_1',
    lessonId: 'lesson_3',
    type: 'multiple_choice',
    question: '공공행정 특화 프롬프트 프레임워크인 TCREI의 5대 요소에 해당하지 않는 것은?',
    options: ['Task (업무 목표)', 'Role (역할 페르소나)', 'Emotion (감정 상태)', 'Instruction on Format (출력 규격)'],
    correctIndex: 2,
    explanation: 'TCREI는 Task(과업), Context(맥락), Role(역할), Execution Guidelines(제약조건), Instruction on Format(출력규격)의 5가지로 구성됩니다.',
    wrongExplanations: [
      '오답입니다. Task는 수행할 과업 목표입니다.',
      '오답입니다. Role은 행정관 페르소나 설정입니다.',
      '정답입니다! Emotion(감정)은 TCREI 프레임워크 요소가 아닙니다.',
      '오답입니다. Instruction은 공공 개조식 출력 규격 지정입니다.'
    ]
  },
  {
    id: 'q3_2',
    lessonId: 'lesson_3',
    type: 'ox',
    question: '[OX 퀴즈] AI에게 "너는 공직 15년 차 행정기획관이야"라고 페르소나(역할)를 부여하면, 공공기관 보고서에 어울리는 전문 어휘와 정돈된 어조로 답변할 확률이 높아진다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 0,
    explanation: '역할 페르소나(Role)를 지정하면 AI가 해당 직무와 연관된 지식 영역과 정중한 행정 문체를 우선적으로 선택해 답변을 생성합니다.',
    wrongExplanations: [
      '정답입니다! 역할 지정은 프롬프트 품질의 핵심입니다.',
      '오답입니다. 역할 부여는 답변의 전문성과 문체를 크게 좌우합니다.'
    ]
  },
  {
    id: 'q3_3',
    lessonId: 'lesson_3',
    type: 'scenario',
    question: '[상황 판단] 간부 보고용 개조식 문서를 작성할 때, AI의 줄글 작성을 방지하고 행정 규격을 강제하기 위한 가장 효과적인 프롬프트 지시는?',
    options: [
      '"길게 쓰지 말고 재미있게 써줘."',
      '"출력 형식은 공공기관 표준에 맞추어 \'1. &rarr; 가. &rarr; (1)\' 번호 체계의 개조식 보고서 양식으로 작성해 줘."',
      '"어차피 내가 수정할 테니 대충 요점만 적어줘."',
      '"질문이 너무 많으니 답변을 한 줄로 끝내줘."'
    ],
    correctIndex: 1,
    explanation: '출력 형식(Instruction on Format)에 공공기관 특유의 번호 체계와 개조식 양식을 명시적으로 지정하면 줄글 대신 반듯한 보고서 형태로 출력됩니다.',
    wrongExplanations: [
      '오답입니다. 공공 보고서 규격에 맞지 않습니다.',
      '정답입니다! 구체적인 번호 체계 규격을 지정해야 합니다.',
      '오답입니다. AI의 작업 완성도를 낮추게 됩니다.',
      '오답입니다. 필요한 행정 정보가 누락됩니다.'
    ]
  },

  // ================= 4차시 퀴즈 (q4_1 ~ q4_3) =================
  {
    id: 'q4_1',
    lessonId: 'lesson_4',
    type: 'multiple_choice',
    question: '내부 기획보고서 원문을 바탕으로 주민 소통용 카드뉴스나 보도자료를 제작할 때 가장 중점을 두어야 할 변환 원칙은?',
    options: [
      '전문적인 법률 및 행정 한자어를 최대한 많이 삽입하여 권위를 높인다.',
      '어려운 행정 용어를 순화하고 주민의 실생활 혜택(일정, 장소, 지원 금액 등) 중심으로 쉽게 재구성한다.',
      '기안문의 본문 내용을 글자 하나 바꾸지 않고 100% 그대로 옮겨 싣는다.',
      '사진이나 시각적 요소 없이 오직 빽빽한 텍스트로만 5장을 채운다.'
    ],
    correctIndex: 1,
    explanation: '대외 홍보 및 카드뉴스는 행정 공급자 중심의 용어를 벗어나 수요자(주민)의 눈높이에 맞춰 직관적인 혜택과 행동 요령 중심으로 전환해야 합니다.',
    wrongExplanations: [
      '오답입니다. 어려운 한자어는 주민들의 이해를 방해합니다.',
      '정답입니다! 주민 체감 혜택 중심의 언어 변환이 핵심입니다.',
      '오답입니다. 기안문과 홍보문은 목적과 대상이 다릅니다.',
      '오답입니다. 카드뉴스는 핵심 카피 위주로 여백을 주어야 합니다.'
    ]
  },
  {
    id: 'q4_2',
    lessonId: 'lesson_4',
    type: 'ox',
    question: '[OX 퀴즈] AI와의 대화에서 한 번에 완벽한 결과를 요구하기보다, 2~3단계의 추가 질문(Follow-up)을 통해 단계적으로 수정·보완하는 것이 훨씬 높은 품질을 보장한다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 0,
    explanation: '단계적 대화(Iterative Prompting)를 통해 헤드라인 선택 &rarr; 본문 작성 &rarr; 어조 교정 순으로 피드백을 주는 것이 단발성 요청보다 훨씬 정교한 결과물을 낳습니다.',
    wrongExplanations: [
      '정답입니다! 단계적 피드백이 프롬프트 엔지니어링의 정수입니다.',
      '오답입니다. 한 번의 요청보다 단계적 개선이 훨씬 우수합니다.'
    ]
  },
  {
    id: 'q4_3',
    lessonId: 'lesson_4',
    type: 'scenario',
    question: '[상황 판단] 30페이지짜리 종합대책 문서를 1페이지 브리핑용으로 압축하고자 한다. AI에게 내릴 지시로 가장 적절한 것은?',
    options: [
      '"페이지 1부터 30까지 아무 문장이나 10줄만 뽑아줘."',
      '"[추진 배경 2줄, 현황 및 문제점 3줄, 핵심 대책 3개 및 소요 예산, 기대 효과] 4대 항목으로 구성된 1페이지 브리핑 서식으로 요약해 줘."',
      '"30페이지를 전부 복사해서 SNS 트위터에 올려줘."',
      '"보고서가 너무 기니까 대책 부분은 빼고 배경만 적어줘."'
    ],
    correctIndex: 1,
    explanation: '요약할 항목의 구조([배경, 현황, 대책, 예산])를 지정해 주어야 보고 브리핑에 즉시 사용할 수 있는 논리적 1페이지 보고서가 완성됩니다.',
    wrongExplanations: [
      '오답입니다. 무작위 발췌는 보고서가 되지 못합니다.',
      '정답입니다! 핵심 항목 구조를 강제하는 완벽한 프롬프트입니다.',
      '오답입니다. 브리핑 보고서 목적에 맞지 않습니다.',
      '오답입니다. 대책이 빠진 보고서는 의미가 없습니다.'
    ]
  },

  // ================= 5차시 퀴즈 (q5_1 ~ q5_3) =================
  {
    id: 'q5_1',
    lessonId: 'lesson_5',
    type: 'multiple_choice',
    question: '회의록 정리 프롬프트를 작성할 때, 회의 후 실제 업무 집행을 위해 반드시 포함시켜야 할 핵심 산출물은?',
    options: [
      '모든 참석자의 사소한 잡담 기록',
      '부서별 후속 조치 과업과 완료 기한이 명시된 액션 아이템(Action Item) 표',
      '회의실 온도와 다과 종류 목록',
      '참석자들의 서명 이미지 파일'
    ],
    correctIndex: 1,
    explanation: '행정 회의록의 핵심 목적은 \'누가, 무엇을, 언제까지 할 것인가\'를 명문화하는 것이므로, 액션 아이템 표 형성이 가장 필수적입니다.',
    wrongExplanations: [
      '오답입니다. 잡담은 회의록에서 배제되어야 합니다.',
      '정답입니다! 실행력을 담보하는 액션 아이템 편성이 필수입니다.',
      '오답입니다. 업무 실행과 무관합니다.',
      '오답입니다. AI 텍스트 프롬프트 산출물과 거리가 멉니다.'
    ]
  },
  {
    id: 'q5_2',
    lessonId: 'lesson_5',
    type: 'ox',
    question: '[OX 퀴즈] 회의 중 부서 간 이견이 좁혀지지 않아 다음 회의로 넘기기로 한 안건은 회의록에서 아예 삭제하는 것이 원칙이다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 1,
    explanation: '합의되지 않은 안건은 \'미결 안건(Pending Issue)\' 또는 \'차기 검토 과제\'로 명확히 기록해 두어야 추후 혼선과 업무 누락을 방지할 수 있습니다.',
    wrongExplanations: [
      '오답입니다. 삭제하면 추후 동일한 논란이 반복됩니다.',
      '정답입니다! 미결 안건으로 분리 기록해 두어야 합니다.'
    ]
  },
  {
    id: 'q5_3',
    lessonId: 'lesson_5',
    type: 'scenario',
    question: '[상황 판단] AI가 정리한 회의록을 다른 협조 부서에 공문으로 발송하기 전에 주무관이 해야 할 행동으로 가장 올바른 것은?',
    options: [
      'AI가 잘 썼을 테니 확인 없이 즉시 시행문 발송 버튼을 누른다.',
      '각 부서 담당자의 역할 분담과 마감 기한이 회의 당시 합의된 취지와 부합하는지 눈으로 대조 검토한다.',
      '회의에 참석하지 않은 직원에게 읽어보라고 떠넘긴다.',
      '회의록 파일의 확장자를 HWP에서 TXT로 바꾼다.'
    ],
    correctIndex: 1,
    explanation: '부서 간 업무 분장과 기한은 민감한 행정 협조 사안이므로, 회의를 주관한 공직자가 사실 부합 여부를 최종 대조해야 합니다.',
    wrongExplanations: [
      '오답입니다. 부서 간 분쟁과 공문 번복이 일어날 수 있습니다.',
      '정답입니다! 합의 취지 부합 여부의 확인이 핵심입니다.',
      '오답입니다. 주관 부서 담당자의 고유 책임입니다.',
      '오답입니다. 내용 검증과 무관합니다.'
    ]
  },

  // ================= 6차시 퀴즈 (q6_1 ~ q6_3) =================
  {
    id: 'q6_1',
    lessonId: 'lesson_6',
    type: 'multiple_choice',
    question: '주민 수백 명의 주관식 민원 건의사항을 AI를 이용해 분류하려 할 때, 가장 일관성 있는 결과를 얻기 위한 방법은?',
    options: [
      '"알아서 적당히 나눠봐"라고 요청한다.',
      '분류할 4~5개 카테고리(예: 도로/교통, 환경/위생, 안전, 기타)를 사전에 정의하여 프롬프트에 지정한다.',
      '민원 내용 중 1건만 입력하고 끝낸다.',
      '결과를 표가 아닌 한 줄의 긴 줄글로 출력하도록 지시한다.'
    ],
    correctIndex: 1,
    explanation: 'AI에게 사전에 명확한 분류 기준(카테고리 목록)을 주어야 수백 건의 데이터가 흔들림 없이 동일한 잣대로 범주화됩니다.',
    wrongExplanations: [
      '오답입니다. 매번 임의의 기준으로 분류되어 통계가 어긋납니다.',
      '정답입니다! 사전 카테고리 지정이 정밀한 군집 분석의 열쇠입니다.',
      '오답입니다. 전체 데이터 분석이 불가능합니다.',
      '오답입니다. 표로 출력해야 건수와 비율 파악이 용이합니다.'
    ]
  },
  {
    id: 'q6_2',
    lessonId: 'lesson_6',
    type: 'ox',
    question: '[OX 퀴즈] AI는 단순 분류뿐만 아니라, 특정 분류(예: 불법 주정차 민원)에 대해 단기적으로 적용 가능한 행정 개선 아이디어를 발산(Brainstorming)하는 데에도 유용하다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 0,
    explanation: 'AI는 방대한 공공 정책 및 해외 모범 사례 데이터를 바탕으로, 당면한 행정 문제에 대한 참신한 개선안을 제시하는 훌륭한 브레인스토밍 파트너입니다.',
    wrongExplanations: [
      '정답입니다! 아이디어 발산에 매우 효과적입니다.',
      '오답입니다. AI는 정책 대안 탐색과 아이디어 발산에 뛰어납니다.'
    ]
  },
  {
    id: 'q6_3',
    lessonId: 'lesson_6',
    type: 'scenario',
    question: '[상황 판단] 매주 반복되는 주간 업무 계획 작성을 AI로 효율화하고자 한다. 가장 바람직한 구축 방식은?',
    options: [
      '매주 월요일마다 처음부터 새로운 백지 프롬프트를 고민해 작성한다.',
      '기본 보고 양식 틀(주요실적, 계획, 현안)을 고정 프롬프트 템플릿으로 저장해 두고, 매주 핵심 키워드 데이터만 교체 입력한다.',
      '동료 직원의 지난주 보고서를 날짜만 바꿔서 매주 올린다.',
      '주간 업무 보고 작성을 전면 거부한다.'
    ],
    correctIndex: 1,
    explanation: '정형화된 반복 업무는 고정 템플릿에 가변 데이터만 끼워 넣는 프롬프트 템플릿화가 최선의 시간 단축 전략입니다.',
    wrongExplanations: [
      '오답입니다. 매주 불필요한 시간 낭비가 발생합니다.',
      '정답입니다! 템플릿화와 데이터 치환이 스마트 행정의 기초입니다.',
      '오답입니다. 직무유기 및 허위 보고에 해당합니다.',
      '오답입니다. 행정 절차 위반입니다.'
    ]
  },

  // ================= 7차시 퀴즈 (q7_1 ~ q7_3) =================
  {
    id: 'q7_1',
    lessonId: 'lesson_7',
    type: 'multiple_choice',
    question: '행정안전부 「공공분야 생성형 AI 활용 가이드라인」에 따를 때, 외부 상용 AI에 입력해서는 절대로 안 되는 정보는?',
    options: [
      '이미 지자체 홈페이지에 대외 공개된 공고문',
      '국가법령정보센터의 법령 조항',
      '비공개 내부 기안문, 국가 비밀, 민원인 개인식별정보(주민번호, 계좌번호 등)',
      '통계청에서 발표한 공식 인구 통계치'
    ],
    correctIndex: 2,
    explanation: '비공개 문서, 비밀, 개인식별정보는 상용 클라우드 AI 서비스에 입력하는 것이 법적으로 엄격히 금지되어 있습니다.',
    wrongExplanations: [
      '오답입니다. 공개 정보는 활용 가능합니다.',
      '오답입니다. 공개 법령은 입력 가능합니다.',
      '정답입니다! 비공개 자료 및 개인식별정보는 절대 금지입니다.',
      '오답입니다. 공공 공개 통계는 활용 가능합니다.'
    ]
  },
  {
    id: 'q7_2',
    lessonId: 'lesson_7',
    type: 'ox',
    question: '[OX 퀴즈] 민원 상담 사례를 AI로 분석할 때, 주민번호와 이름을 마스킹(예: [민원인A], 60대 남성) 처리하여 입력하면 개인정보 유출 위험을 원천 예방할 수 있다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 0,
    explanation: '특정 개인을 식별할 수 없도록 가명 처리하거나 일반화된 식별자로 치환하는 비식별 마스킹(프라이빗 프롬프팅)은 안전한 활용의 기본 수칙입니다.',
    wrongExplanations: [
      '정답입니다! 비식별화는 공공 AI 활용의 핵심 수칙입니다.',
      '오답입니다. 마스킹 처리는 개인정보보호법을 준수하는 올바른 방법입니다.'
    ]
  },
  {
    id: 'q7_3',
    lessonId: 'lesson_7',
    type: 'scenario',
    question: '[상황 판단] 팀장이 "내일 비공개 구정 현안 회의 자료를 ChatGPT에 올려서 요약해 와"라고 지시했다. 주무관의 가장 올바른 대처는?',
    options: [
      '팀장의 지시이므로 즉시 비공개 문서를 클라우드 AI에 원문 그대로 업로드한다.',
      '공공 AI 가이드라인의 비공개 문서 입력 금지 지침을 정중히 설명하고, 비공개 핵심 민감 정보를 제외하거나 비식별 처리한 후 요약하겠다고 보고한다.',
      '아무 말 없이 화를 내며 회의실을 나간다.',
      '자료를 개인 USB에 담아 PC방에 가서 업로드한다.'
    ],
    correctIndex: 1,
    explanation: '공공 AI 보안 지침을 설명하고, 비식별화 및 민감 정보 제거를 거쳐 안전한 방식으로 요약을 수행하는 것이 올바른 공직자의 자세입니다.',
    wrongExplanations: [
      '오답입니다. 보안 위반이며 공직자 본인에게 책임이 귀속됩니다.',
      '정답입니다! 규정을 설명하고 대안적 보안 조치를 취해야 합니다.',
      '오답입니다. 원활한 소통과 업무 조율이 필요합니다.',
      '오답입니다. 보안 위반 행위를 가중시키는 행위입니다.'
    ]
  },

  // ================= 8차시 퀴즈 (q8_1 ~ q8_3) =================
  {
    id: 'q8_1',
    lessonId: 'lesson_8',
    type: 'multiple_choice',
    question: 'AI가 작성해 준 조례 개정안 검토 보고서에서 가장 먼저 확인해야 할 필수 점검 요소는?',
    options: [
      '글꼴 색상이 예쁜지 여부',
      '인용된 조례 명칭과 조·항 번호가 현행 국가법령정보센터의 법령과 정확히 일치하는지 여부',
      '보고서의 분량이 50페이지가 넘는지 여부',
      '문서에 이모티콘이 많이 포함되어 있는지 여부'
    ],
    correctIndex: 1,
    explanation: 'AI는 폐지된 과거 조항이나 가상의 법 조항을 지어내는 환각을 일으킬 수 있으므로, 현행 법령 정보와의 1:1 대조가 최우선입니다.',
    wrongExplanations: [
      '오답입니다. 서식보다 내용의 법적 사실성이 중요합니다.',
      '정답입니다! 법령 명칭과 조항 번호 일치 검증이 최우선입니다.',
      '오답입니다. 공공 보고서는 간결성이 생명입니다.',
      '오답입니다. 공문서에 불필요한 이모티콘은 지양해야 합니다.'
    ]
  },
  {
    id: 'q8_2',
    lessonId: 'lesson_8',
    type: 'ox',
    question: '[OX 퀴즈] AI가 생성한 문장에 사회적 약자, 성별, 특정 지역에 대한 편향(Bias)이나 차별적 어조가 포함되어 있다면, 공무원은 이를 공공 언어에 맞게 순화하고 교정해야 한다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 0,
    explanation: 'AI 학습 데이터에는 사회적 편향이 녹아있을 수 있으므로 공직자는 공공성의 관점에서 포용적이고 차별 없는 언어로 최종 감수해야 합니다.',
    wrongExplanations: [
      '정답입니다! 공공 차별 배제는 행정 문서의 필수 요건입니다.',
      '오답입니다. 편향된 표현을 방치하면 공공 신뢰가 무너집니다.'
    ]
  },
  {
    id: 'q8_3',
    lessonId: 'lesson_8',
    type: 'scenario',
    question: '[상황 판단] AI가 작성한 지원금 통계 표에서 전년도 대비 예산 증가율이 500%로 적혀 있다. 가장 합리적인 행동은?',
    options: [
      '숫자가 드라마틱하니 보도자료에 대대적으로 홍보한다.',
      '우리 구 예산서 원본을 열어 실제 전년도 예산액과 금년도 예산액을 수식으로 직접 재계산해 대조한다.',
      'AI는 계산의 천재이므로 무조건 맞다고 확신한다.',
      '숫자가 너무 크니 대충 뒤의 0 하나를 지우고 기안한다.'
    ],
    correctIndex: 1,
    explanation: 'LLM은 연산기가 아니므로 수치 계산에서 잦은 오류를 냅니다. 예산액과 증가율은 반드시 예산서 원본과 직접 대조해야 합니다.',
    wrongExplanations: [
      '오답입니다. 허위 보도자료 배포로 정정보도 사태가 발생합니다.',
      '정답입니다! 예산서 원본과의 교차 계산 검증이 유일한 해결책입니다.',
      '오답입니다. LLM은 수치 계산에 매우 취약합니다.',
      '오답입니다. 임의 조작은 공문서 위조에 준하는 중과실입니다.'
    ]
  },

  // ================= 9차시 퀴즈 (q9_1 ~ q9_3) =================
  {
    id: 'q9_1',
    lessonId: 'lesson_9',
    type: 'multiple_choice',
    question: '바이브코딩(Vibe Coding)의 핵심 특성을 가장 바르게 설명한 것은?',
    options: [
      'C 언어나 자바스크립트의 문법과 세미콜론 규칙을 완벽히 암기하여 코딩하는 방식',
      '프로그래밍 문법을 암기하지 않고, 일상의 자연어 지시(Prompt)와 피드백으로 AI와 대화하며 프로그램을 완성하는 최신 개발 방식',
      '전문 개발자 10명을 고용하여 외주를 주는 방식',
      '인터넷 연결을 끊고 오프라인 타자기로 문서를 작성하는 방식'
    ],
    correctIndex: 1,
    explanation: '바이브코딩은 코딩의 기술적 장벽을 AI가 대신하고, 사람은 자연어로 요구사항과 기획, 검증에 집중하는 최신 패러다임입니다.',
    wrongExplanations: [
      '오답입니다. 이는 전통적인 구시대 코딩 방식입니다.',
      '정답입니다! 자연어 지시와 대화형 디버깅이 바이브코딩의 본질입니다.',
      '오답입니다. 외주 개발과 무관합니다.',
      '오답입니다. 타자기 작업과 무관합니다.'
    ]
  },
  {
    id: 'q9_2',
    lessonId: 'lesson_9',
    type: 'multiple_choice',
    question: '바이브코딩의 3단계 사이클 순서로 가장 올바른 것은?',
    options: [
      '대화형 디버깅 &rarr; 요구사항 정의 &rarr; 즉각 실행',
      '요구사항 정의(Prompting) &rarr; 즉각 실행 및 검증(Preview) &rarr; 대화형 디버깅(Refining)',
      '배포 및 공유 &rarr; 코드 암기 &rarr; 컴퓨터 구매',
      '요구사항 정의 &rarr; 포기 &rarr; 수작업 엑셀 입력'
    ],
    correctIndex: 1,
    explanation: '자연어로 요구사항을 프롬프트로 정의하고 &rarr; 즉시 실행창에서 결과를 확인하며 &rarr; 대화로 에러를 수정하는 3단계 루프로 진행됩니다.',
    wrongExplanations: [
      '오답입니다. 순서가 뒤바뀌었습니다.',
      '정답입니다! 요구사항 &rarr; 실행 &rarr; 디버깅 3단계 루프입니다.',
      '오답입니다. 엉뚱한 절차입니다.',
      '오답입니다. 포기하지 않고 대화로 개선하는 것이 바이브코딩입니다.'
    ]
  },
  {
    id: 'q9_3',
    lessonId: 'lesson_9',
    type: 'ox',
    question: '[OX 퀴즈] 바이브코딩 환경에서 비개발자 공무원의 핵심 역할은 복잡한 코드를 치는 것이 아니라, 행정 문제를 정의하고 결과물이 규정에 맞는지 검증하는 기획자(Director)의 역할이다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 0,
    explanation: '코드는 AI가 짜므로, 공무원은 "무엇이 필요한지 기획하고, 규정에 맞는지 검토하는 총감독" 역할을 수행하게 됩니다.',
    wrongExplanations: [
      '정답입니다! 공직자는 시스템의 디렉터가 되어야 합니다.',
      '오답입니다. 공무원의 기획력과 검증 역량이 바이브코딩의 성공을 좌우합니다.'
    ]
  },

  // ================= 10차시 퀴즈 (q10_1 ~ q10_3) =================
  {
    id: 'q10_1',
    lessonId: 'lesson_10',
    type: 'multiple_choice',
    question: '웹사이트를 구성하는 3대 요소와 그 역할을 올바르게 짝지은 것은?',
    options: [
      'HTML: 전기 배관 / CSS: 건물 뼈대 / JS: 페인트칠',
      'HTML: 웹의 뼈대와 내용 / CSS: 디자인과 스타일 / JavaScript: 실제 동작과 계산 로직',
      'HTML: 인터넷 주소 / CSS: 서버 컴퓨터 / JavaScript: 모니터 화면',
      'HTML: 데이터베이스 / CSS: 백엔드 / JavaScript: 윈도우 운영체제'
    ],
    correctIndex: 1,
    explanation: 'HTML은 문서의 뼈대와 텍스트, CSS는 색상과 배치 등 디자인, JavaScript는 클릭 시 계산과 화면 변화를 일으키는 동작 엔진입니다.',
    wrongExplanations: [
      '오답입니다. 역할 비유가 잘못되었습니다.',
      '정답입니다! HTML(뼈대), CSS(스타일), JS(동작)의 정석 조합입니다.',
      '오답입니다. 웹 표준 요소와 다른 개념입니다.',
      '오답입니다. 웹 표준 프런트엔드 3요소 정의가 아닙니다.'
    ]
  },
  {
    id: 'q10_2',
    lessonId: 'lesson_10',
    type: 'ox',
    question: '[OX 퀴즈] 화면에 멋진 버튼이 그려져 있다고 해서(UI 디자인), 버튼을 눌렀을 때 자동으로 계산이나 저장이 수행되는 것은 아니다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 0,
    explanation: '외형(HTML/CSS)과 실제 동작 기능(JavaScript)은 별개이므로, 버튼을 클릭했을 때 수행될 동작 로직이 코드로 구현되어 있어야 합니다.',
    wrongExplanations: [
      '정답입니다! 껍데기와 실제 동작의 차이를 이해해야 합니다.',
      '오답입니다. 디자인만으로는 내부 연산이나 저장이 되지 않습니다.'
    ]
  },
  {
    id: 'q10_3',
    lessonId: 'lesson_10',
    type: 'multiple_choice',
    question: '공공기관 사내 PC의 엄격한 보안 환경에서 초보자가 웹도구를 제작할 때 가장 추천되는 경량 아키텍처는?',
    options: [
      '서버 5대와 복잡한 리눅스 도커 컨테이너를 설치하는 대규모 시스템',
      '별도의 설치나 외부 서버 없이 단 하나의 `index.html` 파일로 브라우저에서 즉시 실행되는 싱글 파일 웹앱(Single-File App)',
      '매월 50만 원의 유지보수비가 드는 외주 호스팅 서비스',
      '스마트폰 전용 네이티브 앱스토어 승인 심사 앱'
    ],
    correctIndex: 1,
    explanation: '별도의 빌드 도구나 사내망 프로그램 설치가 차단되는 공공 환경에서는 단일 HTML 파일로 더블클릭 구동되는 싱글 파일 앱이 가장 실용적입니다.',
    wrongExplanations: [
      '오답입니다. 보안 승인 및 설치가 불가능합니다.',
      '정답입니다! 단일 HTML 파일 기반의 독립 실행형 앱이 최고입니다.',
      '오답입니다. 불필요한 예산 낭비입니다.',
      '오답입니다. 사내 실무용 도구로 적합하지 않습니다.'
    ]
  },

  // ================= 11차시 퀴즈 (q11_1 ~ q11_3) =================
  {
    id: 'q11_1',
    lessonId: 'lesson_11',
    type: 'multiple_choice',
    question: 'Google AI Studio가 공공기관 직원의 바이브코딩 실습에 가장 이상적인 이유로 맞지 않는 것은?',
    options: [
      'Google 계정만 있으면 최신 고성능 제미나이(Gemini) 모델을 무료 토큰으로 실습할 수 있다.',
      '별도의 프로그램 설치 없이 웹 브라우저에서 즉시 실행과 미리보기가 가능하다.',
      '반드시 공인인증서와 기관장 직인을 등록해야만 로그인할 수 있다.',
      'System Instruction(시스템 지침) 기능을 통해 공공 개발 규칙을 고정해 둘 수 있다.'
    ],
    correctIndex: 2,
    explanation: 'Google AI Studio는 Google 계정으로 간편하게 무료 접속할 수 있으며, 공인인증서나 유료 결제 등록을 요구하지 않습니다.',
    wrongExplanations: [
      '오답입니다. 무료 토큰 제공은 큰 장점입니다.',
      '오답입니다. 브라우저 즉시 미리보기는 핵심 기능입니다.',
      '정답입니다! 공인인증서나 직인 요구는 사실이 아닙니다.',
      '오답입니다. 시스템 프롬프트 설정은 매우 유용한 기능입니다.'
    ]
  },
  {
    id: 'q11_2',
    lessonId: 'lesson_11',
    type: 'ox',
    question: '[OX 퀴즈] Google AI Studio의 System Instruction에 "모든 웹앱은 단일 index.html 파일로 완결되게 만들어줘"라고 입력해 두면 파일 분할로 인한 실행 실패를 예방할 수 있다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 0,
    explanation: '시스템 지침(System Instruction)은 AI의 모든 답변에 항상 적용되는 기본 행동 수칙이므로, 단일 파일 생성을 보장하는 데 결정적 역할을 합니다.',
    wrongExplanations: [
      '정답입니다! 시스템 프롬프트의 강력한 효과입니다.',
      '오답입니다. 시스템 지침은 모델의 출력 형태를 강제하는 가장 효과적인 수단입니다.'
    ]
  },
  {
    id: 'q11_3',
    lessonId: 'lesson_11',
    type: 'scenario',
    question: '[상황 판단] 우리 사이트 [프롬프트 실습실]에서 프롬프트를 완성한 후 Google AI Studio로 실습을 이어가는 올바른 순서는?',
    options: [
      '사이트를 닫고 컴퓨터를 끈다.',
      '\'프롬프트 복사\' 버튼을 눌러 복사한 뒤 &rarr; \'Google AI Studio 열기\'로 접속하여 &rarr; 프롬프트 창에 붙여넣고 Run(실행)을 누른다.',
      '프롬프트를 손으로 종이에 받아 적은 뒤 스캐너로 읽힌다.',
      'AI Studio 관리자에게 전화해서 승인 요청을 한다.'
    ],
    correctIndex: 1,
    explanation: '프롬프트 복사 &rarr; AI Studio 열기 &rarr; 붙여넣고 실행(Run)의 3단계 흐름이 가장 빠르고 정확한 실습 절차입니다.',
    wrongExplanations: [
      '오답입니다. 실습이 중단됩니다.',
      '정답입니다! 복사 &rarr; 붙여넣기 &rarr; 원클릭 실행 순서입니다.',
      '오답입니다. 불필요하고 비효율적입니다.',
      '오답입니다. AI Studio는 즉시 셀프 실습이 가능합니다.'
    ]
  },

  // ================= 12차시 퀴즈 (q12_1 ~ q12_3) =================
  {
    id: 'q12_1',
    lessonId: 'lesson_12',
    type: 'multiple_choice',
    question: '코드의 변경 이력을 시간 순서대로 기록하고, 문제가 생겼을 때 이전 시점으로 안전하게 되돌려주는 협업 및 버전 관리 도구는?',
    options: ['GitHub (깃허브)', '윈도우 그림판', '카카오톡', '한글 2020'],
    correctIndex: 0,
    explanation: 'Git과 GitHub는 소스코드의 변경 내역을 커밋(Commit) 단위로 기록하고 전 세계와 코드를 공유 및 무료 호스팅(GitHub Pages)할 수 있는 표준 도구입니다.',
    wrongExplanations: [
      '정답입니다! GitHub가 버전 관리의 표준입니다.',
      '오답입니다. 그림판은 이미지 편집기입니다.',
      '오답입니다. 카카오톡은 메신저입니다.',
      '오답입니다. 한글은 워드프로세서입니다.'
    ]
  },
  {
    id: 'q12_2',
    lessonId: 'lesson_12',
    type: 'ox',
    question: '[OX 퀴즈] 초보자는 첫날부터 VS Code, Cursor, Node.js, GitHub 등 모든 전문 도구를 한꺼번에 설치해야만 바이브코딩을 시작할 수 있다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 1,
    explanation: '초보자는 설치가 전혀 필요 없는 Google AI Studio 하나만으로도 충분히 웹앱을 만들 수 있으며, 다른 전문 도구는 필요할 때 점진적으로 확장하면 됩니다.',
    wrongExplanations: [
      '오답입니다. 첫날부터 무리한 도구 설치는 중도 포기의 원인이 됩니다.',
      '정답입니다! AI Studio 하나로 가볍게 시작하는 것이 최선입니다.'
    ]
  },
  {
    id: 'q12_3',
    lessonId: 'lesson_12',
    type: 'scenario',
    question: '[상황 판단] 연구동아리 회원들이 만든 웹도구를 인터넷 주소(URL)로 만들어 다른 직원들과 무료로 공유하고 싶다. 어떤 도구를 활용하는 것이 가장 적절한가?',
    options: [
      '유료 서버를 사비로 구입한다.',
      'GitHub에 단일 HTML 파일을 올리고 GitHub Pages 기능을 켜서 무료 웹사이트 주소를 발급받는다.',
      '직원들에게 파일 50개를 압축해서 카카오톡으로 보낸다.',
      '공유를 포기한다.'
    ],
    correctIndex: 1,
    explanation: 'GitHub Pages는 정적 HTML/CSS/JS 웹사이트를 무료로 웹상에 호스팅해 주는 훌륭한 공공 친화적 기능입니다.',
    wrongExplanations: [
      '오답입니다. 불필요한 사비 지출입니다.',
      '정답입니다! GitHub Pages를 통한 무료 배포가 가장 스마트합니다.',
      '오답입니다. 파일 버전이 꼬이고 보안상 지양해야 합니다.',
      '오답입니다. 공유를 통해 조직 혁신을 이룰 수 있습니다.'
    ]
  },

  // ================= 13차시 퀴즈 (q13_1 ~ q13_3) =================
  {
    id: 'q13_1',
    lessonId: 'lesson_13',
    type: 'multiple_choice',
    question: '웹사이트 제작 프롬프트를 구성할 때 반드시 포함되어야 하는 6대 설계 명세에 해당하지 않는 것은?',
    options: [
      '서비스 목적 및 대상 사용자',
      '화면 구성 및 핵심 기능 3~5개',
      '데이터 저장 방식 및 디자인 기준',
      '개발용 컴퓨터의 제조사 시리얼 번호'
    ],
    correctIndex: 3,
    explanation: '목적, 사용자, 화면, 기능, 저장방식, 디자인은 필수 소프트웨어 명세이지만, 컴퓨터 시리얼 번호는 코드 생성과 무관합니다.',
    wrongExplanations: [
      '오답입니다. 목적과 사용자는 필수입니다.',
      '오답입니다. 화면과 핵심 기능은 뼈대입니다.',
      '오답입니다. 저장과 디자인은 품질을 결정합니다.',
      '정답입니다! 컴퓨터 시리얼 번호는 무관한 정보입니다.'
    ]
  },
  {
    id: 'q13_2',
    lessonId: 'lesson_13',
    type: 'ox',
    question: '[OX 퀴즈] 데이터 저장 방식을 명시하지 않고 "체크리스트 만들어줘"라고만 하면, AI는 새로고침(F5) 시 입력한 데이터가 날아가는 단순 메모리 임시 앱을 만들 확률이 높다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 0,
    explanation: '영구 저장을 명시하지 않으면 AI는 브라우저 새로고침 시 데이터가 초기화되는 기본 상태로 코드를 짜므로, "localStorage에 저장"을 꼭 명시해야 합니다.',
    wrongExplanations: [
      '정답입니다! localStorage 저장 지시가 꼭 필요합니다.',
      '오답입니다. 지시하지 않으면 새로고침 시 데이터가 유지되지 않습니다.'
    ]
  },
  {
    id: 'q13_3',
    lessonId: 'lesson_13',
    type: 'scenario',
    question: '[상황 판단] 여러 사용자가 동시에 데이터를 공유하며 실시간으로 수정하는 웹도구를 만들고 싶다. 올바른 이해는?',
    options: [
      '현재 브라우저 저장(localStorage)만으로 모든 동료의 컴퓨터에 실시간 동기화된다.',
      '다자간 실시간 공유를 위해서는 클라우드 데이터베이스(Firebase, Supabase 등)와 사용자 인증(로그인) 연동이 필요함을 인지한다.',
      'AI에게 "공유되게 해줘"라고 말만 하면 인터넷 선 없이도 마법처럼 공유된다.',
      '동료의 컴퓨터 모니터를 내 자리로 들고 온다.'
    ],
    correctIndex: 1,
    explanation: '브라우저 저장은 내 기기 안에서만 유효하며, 다자간 동시 공유는 서버 및 데이터베이스(DB) 인프라가 필요합니다.',
    wrongExplanations: [
      '오답입니다. localStorage는 내 PC 브라우저 전용입니다.',
      '정답입니다! 다자간 공유에는 서버/DB 확장이 필요함을 정확히 이해하셨습니다.',
      '오답입니다. 기술적 원리를 오해한 것입니다.',
      '오답입니다. 물리적인 기기 이동은 해결책이 아닙니다.'
    ]
  },

  // ================= 14차시 퀴즈 (q14_1 ~ q14_3) =================
  {
    id: 'q14_1',
    lessonId: 'lesson_14',
    type: 'multiple_choice',
    question: '웹앱 실행 중 발생한 오류를 AI에게 설명할 때 가장 신속하고 정확하게 수정 코드를 얻을 수 있는 설명 구조는?',
    options: [
      '"안 돼요, 고쳐줘요"라고 화를 낸다.',
      '[발생 화면] &rarr; [수행한 행동] &rarr; [기대했던 결과] &rarr; [실제 나타난 현상 및 에러 메시지] 순으로 구체적으로 서술한다.',
      '컴퓨터를 재부팅하고 조용히 잊어버린다.',
      '전체 코드를 지우고 처음부터 다시 요청한다.'
    ],
    correctIndex: 1,
    explanation: '행동, 기대 결과, 실제 현상, 콘솔 에러를 육하원칙으로 제시해야 AI가 문제 지점(버그)을 정확히 찾아 교정합니다.',
    wrongExplanations: [
      '오답입니다. AI는 무엇이 안 되는지 알지 못합니다.',
      '정답입니다! 4단계 오류 보고가 디버깅의 정석입니다.',
      '오답입니다. 코딩 오류는 재부팅으로 해결되지 않습니다.',
      '오답입니다. 이전의 좋은 코드까지 잃어버리게 됩니다.'
    ]
  },
  {
    id: 'q14_2',
    lessonId: 'lesson_14',
    type: 'ox',
    question: '[OX 퀴즈] 웹페이지에서 버튼을 클릭했는데 아무 반응이 없다면, F12 키(개발자도구)의 Console 탭에 나타난 빨간색 에러 메시지를 복사해 AI에게 건네주는 것이 최고의 해결책이다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 0,
    explanation: '콘솔(Console)의 빨간색 오류 메시지는 자바스크립트가 어디서 멈췄는지 알려주는 블랙박스 기록이므로, 이를 AI에게 주면 1초 만에 원인을 짚어냅니다.',
    wrongExplanations: [
      '정답입니다! 콘솔 에러 복사는 최고의 디버깅 팁입니다.',
      '오답입니다. 콘솔 에러는 개발자도구가 제공하는 가장 정확한 단서입니다.'
    ]
  },
  {
    id: 'q14_3',
    lessonId: 'lesson_14',
    type: 'scenario',
    question: '[상황 판단] 스마트폰으로 웹사이트를 열었더니 글자가 서로 겹치고 좌우로 흔들리며 가로 스크롤이 생긴다. AI에게 내릴 가장 적절한 수정 지시는?',
    options: [
      '"스마트폰을 버리고 PC로만 보라고 공지해 줘."',
      '"모바일 화면에서도 글자 겹침 없이 세로 1열로 깔끔하게 떨어지도록 미디어 쿼리(또는 Tailwind 반응형 클래스)를 적용하고 가로 넘침(overflow-x)을 방지해 줘."',
      '"글자 크기를 1픽셀로 줄여서 화면에 욱여넣어 줘."',
      '"배경 이미지를 전부 삭제해 줘."'
    ],
    correctIndex: 1,
    explanation: '반응형 웹 디자인(Responsive Design)을 요청하여 모바일 화면 크기에 맞춰 레이아웃이 유연하게 정렬되도록 요청해야 합니다.',
    wrongExplanations: [
      '오답입니다. 모바일 접근성을 무시한 조치입니다.',
      '정답입니다! 반응형 레이아웃과 가로 넘침 방지 지시가 완벽합니다.',
      '오답입니다. 글자를 읽을 수 없게 됩니다.',
      '오답입니다. 레이아웃 문제와 무관합니다.'
    ]
  },

  // ================= 15차시 퀴즈 (q15_1 ~ q15_3) =================
  {
    id: 'q15_1',
    lessonId: 'lesson_15',
    type: 'multiple_choice',
    question: '행정용 웹도구를 완성한 후 공공 업무에 안심하고 투입하기 위해 반드시 거쳐야 할 \'예외 처리(Validation) 점검\'은?',
    options: [
      '입력창에 아무것도 입력하지 않고 \'등록\' 버튼을 눌렀을 때 경고 메시지가 뜨며 빈 데이터 저장을 방지하는지 확인',
      '화면의 글씨체를 매일 다른 폰트로 바꾸기',
      '컴퓨터 소리를 최대로 키워놓기',
      '화면을 마우스로 100번 연속 광클릭하여 컴퓨터를 멈추게 만들기'
    ],
    correctIndex: 0,
    explanation: '빈 값 입력 방지, 숫자 입력란에 문자 입력 방지 등 유효성 검사(Validation)가 되어 있어야 데이터 오염을 막을 수 있습니다.',
    wrongExplanations: [
      '정답입니다! 빈 값 방지 및 유효성 검사는 소프트웨어의 기본입니다.',
      '오답입니다. 일관성 있는 디자인이 중요합니다.',
      '오답입니다. 예외 처리와 무관합니다.',
      '오답입니다. 중복 방지 처리가 되어 있는지 점검하는 목적이어야 합니다.'
    ]
  },
  {
    id: 'q15_2',
    lessonId: 'lesson_15',
    type: 'ox',
    question: '[OX 퀴즈] 만들기 미션의 완료는 외부 서버가 자동으로 점검해 주는 것이 아니며, 학습자가 제공된 체크리스트를 하나씩 직접 테스트하고 확인하여 인정받는 자기주도적 검증 방식이다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 0,
    explanation: '바이브코딩 실습은 사용자가 직접 동작과 인터랙션을 하나하나 테스트하며 완성도를 체감하는 사용자 자가 검증이 핵심 원리입니다.',
    wrongExplanations: [
      '정답입니다! 스스로 검증하는 습관이 실력을 만듭니다.',
      '오답입니다. 외부 자동 검증이 아닌 학습자의 주도적 자가 점검입니다.'
    ]
  },
  {
    id: 'q15_3',
    lessonId: 'lesson_15',
    type: 'scenario',
    question: '[상황 판단] 미션 2(체크리스트)를 제작한 후 새로고침(F5)을 눌렀더니 등록해 둔 업무 목록이 모두 사라졌다. 주무관이 취해야 할 조치는?',
    options: [
      '원래 그런 것이니 매일 아침 새로 입력하기로 마음먹는다.',
      'AI에게 "등록된 할 일 목록을 브라우저의 localStorage에 JSON 형태로 저장하고, 새로고침 시 다시 불러오도록 코드를 보완해 줘"라고 요청한다.',
      '브라우저를 삭제하고 컴퓨터를 바꾼다.',
      '더 이상 웹사이트를 만들지 않는다.'
    ],
    correctIndex: 1,
    explanation: 'localStorage를 활용한 데이터 영구 보관 로직을 추가해 달라고 후속 프롬프트를 내리면 손쉽게 영구 저장 도구로 업그레이드할 수 있습니다.',
    wrongExplanations: [
      '오답입니다. 불편한 수작업을 방치할 필요가 없습니다.',
      '정답입니다! localStorage 연동 요청으로 완벽히 해결됩니다.',
      '오답입니다. 극단적이고 무의미한 대처입니다.',
      '오답입니다. 후속 대화로 얼마든지 고칠 수 있습니다.'
    ]
  },

  // ================= 16차시 퀴즈 (q16_1 ~ q16_3) =================
  {
    id: 'q16_1',
    lessonId: 'lesson_16',
    type: 'multiple_choice',
    question: '실전 만들기 미션을 마친 후 작성하는 성장을 위한 \'3단 회고(Retrospective)\'의 3대 항목에 속하지 않는 것은?',
    options: [
      '이번 제작을 통해 새롭게 배운 점 (Learned)',
      '실습 중 겪었던 어려움과 시행착오 (Difficulties)',
      '어려움을 극복한 방법과 향후 개선점 (Improvements)',
      '동료 직원의 사적인 비밀과 험담'
    ],
    correctIndex: 3,
    explanation: '프로젝트 회고는 배운 점, 어려웠던 점, 다음 개선점의 3단계로 성찰하여 자신의 디지털 역량으로 체화하는 과정입니다.',
    wrongExplanations: [
      '오답입니다. 배운 점은 성장의 핵심입니다.',
      '오답입니다. 어려웠던 점의 기록은 다음 실수를 막아줍니다.',
      '오답입니다. 개선점은 차기 프로젝트의 밑거름입니다.',
      '정답입니다! 동료 험담은 회고와 전혀 무관하며 부적절합니다.'
    ]
  },
  {
    id: 'q16_2',
    lessonId: 'lesson_16',
    type: 'ox',
    question: '[OX 퀴즈] 우리 사이트 [나의 학습] 메뉴에서는 지금까지의 학습 진도, 경험치, 퀴즈 기록을 JSON 파일로 백업(내보내기)해 내 컴퓨터에 안전하게 보관할 수 있다.',
    options: ['O (그렇다)', 'X (아니다)'],
    correctIndex: 0,
    explanation: 'JSON 내보내기와 가져오기 기능을 통해 브라우저 캐시 삭제 시에도 소중한 학습 데이터를 언제든 복원할 수 있습니다.',
    wrongExplanations: [
      '정답입니다! 데이터 주권과 백업을 완벽히 지원합니다.',
      '오답입니다. JSON 백업 및 복원 기능이 탑재되어 있습니다.'
    ]
  },
  {
    id: 'q16_3',
    lessonId: 'lesson_16',
    type: 'scenario',
    question: '[상황 판단] 16개 차시와 필수 실습 미션을 모두 완주한 공직자의 다음 행보로 가장 바람직한 것은?',
    options: [
      '"이제 다 배웠으니 AI는 영원히 쳐다보지 않는다."',
      '체득한 바이브코딩 역량을 바탕으로 내 부서의 실제 반복 업무(여비 계산, 큐시트 작성 등)를 개선하는 작은 웹도구를 동아리원들과 함께 지속적으로 만들어 나간다.',
      '사내 보안 프로그램을 강제로 해제하려 시도한다.',
      '모든 행정 결재를 AI에게 전적으로 맡기고 퇴근한다.'
    ],
    correctIndex: 1,
    explanation: '학습의 진정한 완성은 자신의 부서 현장에서 작은 불편을 스스로 해결하는 도구를 만들며 스마트 행정혁신을 실천하는 것입니다.',
    wrongExplanations: [
      '오답입니다. 지속적인 활용과 발전이 중요합니다.',
      '정답입니다! 실무 적용과 동아리 협업이 행정혁신의 꽃입니다.',
      '오답입니다. 보안 규정은 철저히 준수해야 합니다.',
      '오답입니다. 최종 결재와 책임은 반드시 공무원의 몫입니다.'
    ]
  }
];



/* ==========================================================================
 * [모듈 로드] data/promptTemplates.js
 * ========================================================================== */

/**
 * 스마트 행정혁신 AI 러닝랩 - 프롬프트 템플릿 & 빌더 데이터
 * 
 * [초보자 설명]
 * 이 파일은 웹사이트 제작에 필요한 고품질 프롬프트를 제공합니다.
 * 1) 메타프롬프트 규격 6대 기본 템플릿
 * 2) 커리큘럼 특화 핸즈온 프로젝트 5선 프롬프트 팩
 * 3) 5대 상황별 오류 수정/개선 프롬프트
 * 4) 10단계 마법사 빌더의 질문 및 예시 데이터
 */

// 1. 메타프롬프트 규격 6대 기본 템플릿
const BASE_TEMPLATES = [
  {
    id: 'tpl_club',
    title: '1. 연구동아리 소개·활동 안내 사이트',
    icon: '👥',
    tag: '소통/홍보',
    whenToUse: '우리 동아리의 설립 취지, 연간 활동 계획, 회원 소개, 자주 묻는 질문(FAQ)을 기관 내 직원들에게 깔끔하게 홍보하고 싶을 때',
    basePrompt: `너는 공공기관 웹서비스 전문 프런트엔드 개발자야.
'스마트 행정혁신 연구동아리 공식 소개 사이트'를 단일 index.html 파일로 완벽하게 제작해 줘.

[화면 구성 및 레이아웃]
1. 헤더: 동아리 로고 텍스트, '동아리 소개', '학습 주제', '활동 캘린더', 'FAQ' 네비게이션 메뉴
2. 히어로 배너: "AI로 혁신하는 스마트 공공행정" 메인 슬로건 및 '동아리 가입 신청' 버튼
3. 동아리 소개 카드: 동아리 목표 3가지(생성형 AI 탐구, 바이브코딩 실무 접목, 일하는 방식 혁신)
4. 활동 일정 섹션: 상반기 월별 세미나 일정표
5. FAQ 아코디언: "코딩을 전혀 몰라도 참여할 수 있나요?" 등 질문 클릭 시 답변이 펼쳐지는 인터랙션
6. 푸터: 담당자 연락처(구내 1234), 저작권 문구

[디자인 및 기술 기준]
- Tailwind CSS CDN을 활용한 모던하고 신뢰감 있는 딥네이비/에메랄드 컬러 팔레트
- 모든 텍스트는 가독성 높은 16px 이상, line-height 1.7 적용
- 스마트폰 화면에서도 메뉴가 자연스럽게 반응하는 반응형 웹 지원
- 자바스크립트는 외부 라이브러리 없이 순수 바닐라 JS로 내장`,
    customizableParts: [
      '동아리 이름 및 슬로건 문구',
      '월별 세미나 주제 및 발표 일자',
      '동아리 가입 문의 구내 전화번호 및 이메일'
    ],
    followupPrompts: [
      'FAQ 항목을 3개 더 추가해 주고, 검색창을 달아서 질문 키워드로 실시간 필터링되게 해줘.',
      '동아리 가입 신청 버튼을 누르면 간단한 모달(팝업) 창이 떠서 이름과 소속 부서를 입력받게 해줘.'
    ],
    checklist: [
      '메뉴 클릭 시 해당 섹션으로 부드럽게 스크롤 이동하는가?',
      'FAQ 질문을 눌렀을 때 답변이 매끄럽게 펼쳐지고 닫히는가?',
      '모바일 화면에서 텍스트 겹침이나 좌우 잘림이 없는가?'
    ]
  },
  {
    id: 'tpl_event',
    title: '2. 행사 일정·준비 체크리스트',
    icon: '📅',
    tag: '행사/일정',
    whenToUse: '워크숍, 정책 포럼, 성과공유회 등 공공 행사의 시간대별 타임테이블과 D-Day 준비물 체크리스트를 체계적으로 관리할 때',
    basePrompt: `너는 공공 행사 기획 전문 웹 디자이너야.
'2026 공공혁신 성과공유회 일정 및 준비 점검 도구'를 단일 index.html 파일로 제작해 줘.

[핵심 기능 및 화면]
1. 행사 타임테이블: 시간(09:00~17:00), 프로그램명, 발표자, 장소 등이 정돈된 인터랙티브 타임라인
2. D-Day 준비 체크리스트:
   - [사전 준비], [행사 당일], [사후 정리] 3개 탭으로 분류
   - 항목별 체크박스 토글 시 완료 취소선 및 배지 표시
   - 실시간 준비 완료율 프로그레스 바(0~100%) 반영
3. 새로운 준비 과업을 추가하는 인풋 폼
4. 데이터 저장: 체크 상태와 추가 항목이 브라우저의 localStorage에 자동 저장되어 새로고침해도 유지될 것

[스타일 기준]
- 차분한 슬레이트 블루 톤과 눈이 편안한 라이트 모드
- 직관적인 아이콘과 카드 스타일 레이아웃`,
    customizableParts: [
      '행사명, 일시, 개최 장소',
      '타임테이블 세부 세션 명칭 및 발표자',
      '사전/당일 기본 준비물 목록'
    ],
    followupPrompts: [
      '체크리스트의 전체 항목을 텍스트 파일(.txt)로 내려받는 버튼을 추가해 줘.',
      '행사 시작일까지 남은 시간을 실시간으로 보여주는 D-Day 카운트다운 타이머를 헤더에 넣어줘.'
    ],
    checklist: [
      '체크박스를 누를 때마다 상단 진행률 퍼센트(%)가 정확히 계산되는가?',
      '새로고침(F5)을 해도 체크해 둔 상태가 그대로 복원되는가?',
      '새로운 항목 추가 시 빈칸 입력을 방지하는 경고창이 뜨는가?'
    ]
  },
  {
    id: 'tpl_manual',
    title: '3. 업무 매뉴얼 검색·열람 사이트',
    icon: '📚',
    tag: '지식/업무',
    whenToUse: '두꺼운 한글 파일에 갇혀 있는 부서 업무 매뉴얼이나 자주 찾는 법령/지침을 단어 검색으로 1초 만에 찾아보고 싶을 때',
    basePrompt: `너는 행정 지식관리 시스템 전문 개발자야.
'부서 스마트 업무 매뉴얼 검색 포털'을 단일 index.html 파일로 만들어 줘.

[화면 및 기능]
1. 상단 대형 검색창: 실시간 키워드 입력 시 제목과 내용에 해당 단어가 포함된 매뉴얼 카드가 즉시 필터링됨
2. 카테고리 필터 버튼: [전체], [기안/결재], [예산/회계], [복무/인사], [민원응대]
3. 매뉴얼 카드 그리드:
   - 카드 클릭 시 상세 모달 창이 열리며 [업무 처리 절차], [관련 서식], [담당 부서 근거 조항] 전문 표시
   - '서식 복사' 및 '관련 규정 링크' 버튼 포함
4. 예시 데이터: 각 카테고리별로 공공기관에서 실제 쓰는 현실적인 가상 매뉴얼 데이터 6개 이상 내장

[스타일]
- 관공서 인트라넷에 어울리는 깔끔한 화이트/네이비 UI, Tailwind CSS 적용
- 폰트는 Pretendard 및 가독성 최우선 배치`,
    customizableParts: [
      '부서명 및 매뉴얼 카테고리 분류명',
      '실제 우리 부서에서 자주 쓰는 업무 지침 데이터 텍스트',
      '관련 담당자 연락처'
    ],
    followupPrompts: [
      '검색된 단어에 노란색 형광펜 하이라이트 효과가 적용되도록 자바스크립트를 보강해 줘.',
      '직원들이 자주 찾는 인기 매뉴얼 Top 3를 검색창 바로 아래에 퀵태그로 띄워줘.'
    ],
    checklist: [
      '검색창에 글자를 칠 때마다 즉각적으로 카드가 걸러지는가?',
      '카테고리 탭을 변경했을 때 정상적으로 해당 항목만 표시되는가?',
      '모달 창의 닫기(X) 버튼 및 배경 클릭 시 창이 잘 닫히는가?'
    ]
  },
  {
    id: 'tpl_meeting',
    title: '4. 회의 안건·결정사항 정리 도구',
    icon: '📝',
    tag: '회의/협업',
    whenToUse: '부서 회의나 TF 미팅 중 논의된 발언을 정리하고, [결정사항]과 [부서별 후속 조치 액션아이템] 표를 즉각 공문 서식으로 추출할 때',
    basePrompt: `너는 행정 워크플로우 전문 소프트웨어 엔지니어야.
'스마트 회의 안건 및 결정사항 정리 도구'를 단일 index.html로 제작해 줘.

[핵심 기능]
1. 회의 기본 정보 입력: 회의명, 일시, 참석자, 주관 부서
2. 논의 안건 블록 추가:
   - 안건 제목, 찬반/이견 요약, 최종 결정사항
3. 액션 아이템(Action Item) 테이블 생성기:
   - [담당 부서 | 담당자 | 추진 과업 | 완료 기한 | 진행 상태] 열 추가/삭제 기능
4. '행정 통보문 양식으로 복사' 버튼:
   - 클릭 시 정돈된 표준 공문 개조식 텍스트로 변환되어 클립보드에 자동 복사됨
5. 브라우저 localStorage에 현재 작성 중인 회의록 임시 저장 및 불러오기`,
    customizableParts: [
      '회의 기본 서식 및 협조 부서명',
      '공문 출력 양식의 머리말/꼬리말',
      '진행 상태 옵션 (대기, 진행중, 완료)'
    ],
    followupPrompts: [
      '작성된 회의 결과를 인쇄(Print)할 때 용지에 깔끔하게 맞도록 인쇄 전용 CSS(@media print)를 넣어줘.',
      '액션 아이템 마감일이 오늘 기준으로 3일 이내인 항목에 주황색 경고 뱃지를 띄워줘.'
    ],
    checklist: [
      '액션 아이템 표에 행(Row) 추가 및 삭제가 자유롭게 작동하는가?',
      '복사 버튼 클릭 시 복사 완료 토스트 알림이 뜨는가?',
      '페이지 새로고침 시 이전에 입력한 안건이 사라지지 않는가?'
    ]
  },
  {
    id: 'tpl_todo',
    title: '5. 개인 행정업무 스마트 체크리스트',
    icon: '✅',
    tag: '개인/생산성',
    whenToUse: '오늘 처리해야 할 기안, 지출결의, 민원 전화, 출장 등 일일 업무를 우선순위별로 관리하고 퇴근 전 성과를 확인하고 싶을 때',
    basePrompt: `너는 개인 업무 생산성 도구 전문 개발자야.
'공무원 일일 스마트 업무 체크리스트'를 단일 index.html 파일로 완성해 줘.

[상세 기능]
1. 업무 등록 폼:
   - 업무명, 우선순위([긴급/중요], [일반], [일상반복]), 마감 시간
2. 스마트 필터링:
   - [오늘 할 일], [완료된 일], [긴급 업무만 보기]
3. 인터랙션:
   - 체크 시 완료 취소선 애니메이션 및 오늘 완료 개수 카운터 증가
   - 수정 및 삭제 버튼 제공
4. '오늘의 업무 일지 복사' 기능:
   - 클릭 시 "■ 금일 추진 실적 (완료 N건)" 형식의 텍스트가 복사되어 내부 메신저나 업무일지에 바로 붙여넣을 수 있음
5. localStorage를 활용한 완벽한 영구 보관`,
    customizableParts: [
      '우선순위 분류 명칭 및 태그 색상',
      '업무일지 복사 문구 양식',
      '기본 샘플 업무 항목'
    ],
    followupPrompts: [
      '매일 아침 반복되는 루틴 업무(메일 확인, 온나라 접수 등)를 원클릭으로 일괄 등록하는 템플릿 버튼을 만들어줘.',
      '전체 완료 업무를 한 번에 지우는 "완료 항목 정리" 버튼을 추가해 줘.'
    ],
    checklist: [
      '빈칸으로 추가 버튼을 눌렀을 때 등록되지 않고 인풋에 포커스가 가는가?',
      '우선순위 뱃지(긴급, 일반)가 색상별로 명확히 구별되는가?',
      '새로고침 후에도 등록한 업무와 완료 상태가 유지되는가?'
    ]
  },
  {
    id: 'tpl_quiz',
    title: '6. 자체 학습 퀴즈 웹사이트',
    icon: '💡',
    tag: '교육/평가',
    whenToUse: '부서 내 청렴 교육, 개인정보보호 수칙, 신규 발령자 직무 교육 문제를 퀴즈 게임 형태로 재미있게 풀 수 있는 웹앱이 필요할 때',
    basePrompt: `너는 공공 교육 게이미피케이션 전문가야.
'공직 청렴 및 보안 직무 퀴즈 웹앱'을 단일 index.html 파일로 제작해 줘.

[주요 기능]
1. 문제 풀이 뷰:
   - 한 번에 1문제씩 카드 형태로 제시
   - 4지선다형 선택지 클릭 시 즉시 정답/오답 판정 및 상세 해설 박스 노출
2. 진행 상태 바: 현재 문제 번호 / 전체 문제 수 (예: 3 / 10 문제)
3. 최종 결과 화면:
   - 100점 만점 환산 점수, 획득 등급(청렴 마스터, 우수 등), 틀린 문제 다시 보기 목록
   - '처음부터 다시 풀기' 버튼
4. 기본 문제 데이터: 공직 실무에서 자주 겪는 5개의 퀴즈 데이터 내장`,
    customizableParts: [
      '퀴즈 주제 및 문제 텍스트/해설 데이터',
      '합격 점수 기준 및 등급 명칭',
      '테마 색상'
    ],
    followupPrompts: [
      '문제를 풀 때마다 점수와 함께 귀여운 애니메이션 효과를 더해줘.',
      '오답만 모아서 다시 풀어보는 "오답 재도전 모드" 버튼을 결과 화면에 추가해 줘.'
    ],
    checklist: [
      '선택지를 클릭하면 정답 여부와 해설이 즉각 표시되는가?',
      '모든 문제를 풀고 난 뒤 최종 점수가 정확히 계산되어 결과창으로 전환되는가?',
      '다시 풀기를 눌렀을 때 점수와 문항 상태가 깔끔하게 초기화되는가?'
    ]
  }
];

// 2. 커리큘럼 특화 핸즈온 5선 프롬프트 팩 (학습 커리큘럼 문서 3절 100% 반영)
const HANDSON_PROJECTS = [
  {
    id: 'handson_travel',
    title: '핸즈온 1. 공무원 여비 규정 기반 출장비 자동 계산기',
    category: '회계/복무',
    desc: '관내/관외 구분, 시간별 일비, 식비 감액 규칙을 반영해 결재 상신용 문구를 자동 생성하는 단일 페이지 웹앱',
    prompt: `너는 지자체 회계·여비 규정 전문 풀스택 개발자야.
'지방공무원 여비 규정 기반 출장비 자동 계산기'를 단일 index.html 파일로 완벽하게 구현해 줘.

[필수 요구 규칙]
1. 출장 구분 선택: [관내 출장] / [관외 출장] 탭
2. 관내 출장 계산 규칙:
   - 출장 시간: 4시간 이상(일비 20,000원) / 4시간 미만(일비 10,000원) 라디오 선택
   - 공용차량 이용 여부 체크박스: 체크 시 일비에서 10,000원 자동 감액
3. 관외 출장 계산 규칙:
   - 일비(20,000원/일), 식비(25,000원/일, 1식당 감액 옵션)
   - 운임(실비 입력란) + 숙박비(실비 입력란)
4. 산출 결과 및 복사:
   - 총 출장 여비 합계 실시간 계산
   - '결재 품의용 문구 생성' 버튼 클릭 시 아래 양식으로 클립보드에 자동 복사:
     "■ 출장 개요: 2026.OO.OO 관내출장(4시간 이상, 공용차량 미이용) / 산출액: 금20,000원(일비 20,000원) / 지방공무원 여비조례 준용"

[디자인]
- Tailwind CSS를 사용한 신뢰감 있는 공공 금융/회계 스타일, 숫자 콤마(,) 자동 표기`,
    points: ['관내 4시간 기준 일비 차등', '공용차량 이용 시 감액 로직', '결재 품의용 문구 1초 복사']
  },
  {
    id: 'handson_press',
    title: '핸즈온 2. 보도자료 & SNS 홍보문 생성 스튜디오',
    category: '기획/홍보',
    desc: '행사명, 일시, 주요 성과 3가지를 입력하면 공공 표준 보도자료 본문과 카드뉴스용 헤드라인 5종을 동시 출력',
    prompt: `너는 지자체 대변인실 전문 보도자료 기획자이자 웹 개발자야.
'공공 보도자료 & SNS 홍보문 자동 생성 스튜디오' 웹앱을 단일 index.html로 만들어 줘.

[입력 항목]
1. 행사/정책 명칭
2. 추진 일시 및 장소
3. 핵심 성과 및 주민 혜택 3가지
4. 담당 부서 및 담당자 연락처
5. 강조하고 싶은 어조: [성과 강조형], [주민 친화형], [안전/신뢰형]

[출력 결과 (탭 전환)]
- 탭 1: '공공 표준 보도자료 양식' (헤드라인 3종 추천 + 리드문 + 본문 3단 구성 + 담당 과장 가상 코멘트 + 문의처)
- 탭 2: '카드뉴스 & SNS 카피 5종' (인스타그램/페이스북용 톡톡 튀는 핵심 카피 및 해시태그 10개)
- '원클릭 본문 복사' 및 '텍스트 파일(.txt) 저장' 버튼 지원`,
    points: ['표준 보도자료와 SNS 카피의 동시 생성', '헤드라인 다각화', '텍스트 다운로드 지원']
  },
  {
    id: 'handson_complaint',
    title: '핸즈온 3. 악성·반복 민원 대응 가이드 & 표준 답변기',
    category: '민원/소통',
    desc: '민원 유형(불친절, 정보공개, 도로/교통, 불법주정차 등) 선택 시 관련 법령 근거와 공손하면서도 명확한 답변 초안 출력',
    prompt: `너는 민원 행정 법률 전문가이자 대화형 웹앱 개발자야.
'공공 악성·반복 민원 신속 대응 가이드 및 표준 답변기'를 단일 index.html로 제작해 줘.

[주요 구성]
1. 민원 분류 선택 드롭다운:
   - [불법 주정차 단속 이의], [도로 파손/포트홀 보수], [정보공개 청구 처리 지연 안내], [폭언/악성 민원 종결 안내]
2. 민원 요지 키워드 입력창 및 현장 특이사항 체크박스
3. 생성 결과:
   - 공손한 인사말 & 공감 표현
   - 관련 법률 및 조례 근거 명확한 조항 제시
   - 행정 처리 절차 및 구체적 향후 일정 안내
   - 종결 인사 및 담당 부서 안내
4. 공직자 권익 보호 알림:
   - 폭언·협박성 민원에 대한 법적 고지 멘트(녹음 고지, 공무집행방해 경고) 토글 카드 내장`,
    points: ['민원 유형별 법령 근거 탑재', '공감과 단호함의 균형', '공직자 보호 고지 멘트 연계']
  },
  {
    id: 'handson_cuesheet',
    title: '핸즈온 4. 공공 행사·워크숍 큐시트 & 체크리스트 생성기',
    category: '총무/의전',
    desc: '참석 인원, 행사 성격, VIP 참석 여부를 체크하면 시간대별 시나리오 및 사전 점검표 자동 편성',
    prompt: `너는 정부 의전 및 공공 행사 총괄 디렉터이자 웹 개발자야.
'공공 행사·워크숍 시나리오 큐시트 & 점검표 생성기'를 단일 index.html로 만들어 줘.

[입력 필드]
- 행사명, 일시, 장소, 예상 참석 인원
- 주요 내빈(VIP: 구청장, 시의원 등) 참석 여부 토글
- 행사 유형: [개회식/기념식], [주민설명회], [직원 워크숍]

[자동 생성 기능]
1. 분 단위 상세 큐시트:
   - 시간(예: 14:00~14:05), 진행 순서(국민의례, 내빈소개, 축사 등), 담당자, 무대 음향/조명/스크린 연출 멘트
2. 사전 점검 체크리스트:
   - 의전 좌석 배치, VIP 명패, 다과, 마이크 배터리, 현수막 규격 등 자가 점검표
3. 큐시트 엑셀 호환 CSV 다운로드 또는 화면 인쇄(Print) 레이아웃 지원`,
    points: ['VIP 의전 포함 분 단위 타임테이블', '음향/조명 큐 사인 연동', '인쇄 최적화']
  },
  {
    id: 'handson_minutes',
    title: '핸즈온 5. 회의록 요약 및 액션 아이템(담당자별) 분배기',
    category: '기획/협업',
    desc: '회의 내용 텍스트를 붙여넣으면 \'결정 사항\', \'부서별 후속 조치\', \'완료 기한\' 표(Table)로 정돈',
    prompt: `너는 공공 조직 업무 프로세스 혁신 전문가야.
'스마트 회의록 요약 및 담당자별 액션 아이템 분배기'를 단일 index.html로 제작해 줘.

[입력창]
- 회의 날것의 메모나 음성인식 녹취 텍스트를 붙여넣을 수 있는 대형 텍스트에어리어

[자동 파싱 & 구조화 출력]
1. 3줄 핵심 요약: 오늘 회의의 핵심 취지와 배경
2. 주요 결정사항(Decisions): 합의된 정책 3가지
3. 액션 아이템 테이블:
   - 부서명 | 담당자 | 구체적 실행 과업 | 완료 목표일 | 긴급도(높음/보통)
4. 미결 과제(Issues): 차기 회의 재논의 사안
5. '결재 보고용 개조식 텍스트 복사' 및 'JSON 데이터 내보내기' 지원`,
    points: ['긴 텍스트의 즉각 구조화', '부서별 업무 분장 표 도출', '미결 안건 분리']
  }
];

// 3. 5대 상황별 오류 수정/개선 프롬프트
const DEBUG_PROMPTS = [
  {
    id: 'debug_font',
    title: '글자가 너무 작고 읽기 어려울 때',
    situation: '폰트 크기가 12~14px로 너무 작아 가독성이 떨어지고 노안이나 모바일에서 답답하게 느껴질 때',
    promptText: `전체 웹페이지의 텍스트 가독성을 대폭 개선해 줘.
1. 기본 본문(body) 폰트 크기를 최소 16px(text-base) 이상으로 키우고, 줄 간격(line-height)을 1.75로 여유 있게 설정해 줘.
2. 제목(h1, h2, h3)의 크기 대비를 확실히 주어 문서의 계층 구조가 한눈에 들어오게 해줘.
3. 텍스트 색상을 너무 흐린 회색(#999) 대신 또렷한 짙은 슬레이트(#1e293b, #334155)로 교체해 줘.`
  },
  {
    id: 'debug_mobile',
    title: '모바일 화면에서 요소가 겹치거나 잘릴 때',
    situation: '스마트폰으로 볼 때 좌우 가로 스크롤이 생기거나 버튼과 텍스트가 서로 겹쳐 깨질 때',
    promptText: `스마트폰 모바일 화면에서의 완벽한 반응형 레이아웃을 적용해 줘.
1. 가로 스크롤(overflow-x: hidden)이 절대 발생하지 않도록 컨테이너 최대 너비(max-w-*)와 패딩을 유연하게 조정해 줘.
2. 데스크톱에서 가로 3~4열로 배치된 카드 그리드를 모바일에서는 세로 1열(grid-cols-1 md:grid-cols-3)로 자연스럽게 정렬해 줘.
3. 버튼과 터치 영역은 모바일에서도 손가락으로 누르기 편하게 최소 높이 44px 이상 패딩을 확보해 줘.`
  },
  {
    id: 'debug_click',
    title: '버튼을 눌러도 아무 반응이 없을 때',
    situation: '화면에 버튼은 보이지만 클릭했을 때 계산이나 팝업이 전혀 동작하지 않을 때',
    promptText: `버튼 클릭 시 자바스크립트 동작이 실행되지 않는 오류를 수정해 줘.
1. 브라우저 F12 개발자도구 Console에 자바스크립트 문법 오류나 변수 미정의(ReferenceError)가 없는지 전면 점검해 줘.
2. 버튼의 id와 document.getElementById 또는 addEventListener 연결이 정확한지 확인해 줘.
3. 버튼 클릭 시 사용자가 결과를 체감할 수 있도록 결과 영역에 애니메이션이나 최소한의 alert 알림창이라도 확실히 뜨게 보완해 줘.`
  },
  {
    id: 'debug_storage',
    title: '새로고침(F5)을 누르면 데이터가 날아갈 때',
    situation: '입력해 둔 체크리스트나 계산 결과가 브라우저를 껐다 켜거나 새로고침하면 사라질 때',
    promptText: `사용자가 입력하거나 체크한 모든 데이터가 브라우저의 localStorage에 영구 보존되도록 개선해 줘.
1. 데이터가 추가되거나 체크 상태가 바뀔 때마다 \`localStorage.setItem('MY_APP_DATA', JSON.stringify(data))\`로 즉시 저장해 줘.
2. 페이지가 로드되는 시점(window.onload 또는 DOMContentLoaded)에 저장된 데이터를 불러와 화면에 완벽히 복원해 줘.
3. 저장된 데이터가 없을 때는 친절한 기본 안내 문구나 예시 데이터 1~2개를 기본 표시해 줘.`
  },
  {
    id: 'debug_search',
    title: '검색창이나 카테고리 필터를 추가하고 싶을 때',
    situation: '데이터 목록이 많아져서 원하는 항목을 키워드로 실시간 검색하고 싶을 때',
    promptText: `목록 상단에 실시간 검색창과 카테고리 필터 버튼을 추가해 줘.
1. 검색 입력창(input)에 키워드를 타이핑할 때마다(input 이벤트) 대소문자 구분 없이 제목과 본문에 단어가 포함된 카드만 실시간으로 걸러지게 해줘.
2. 검색 결과가 0건일 때는 "일치하는 행정 자료가 없습니다"라는 깔끔한 빈 상태(Empty state) 안내를 띄워줘.
3. 검색어를 한 번에 지우는 'X' 초기화 버튼도 함께 넣어줘.`
  }
];

// 4. 10단계 프롬프트 빌더 마법사 질문 및 옵션
const PROMPT_BUILDER_STEPS = [
  {
    step: 1,
    key: 'appName',
    label: '1. 만들고 싶은 웹사이트/도구의 이름',
    placeholder: '예: 우리 부서 초과근무 확인기, 지자체 보도자료 스튜디오',
    help: '누가 들어도 어떤 역할을 하는지 알 수 있는 명확한 명칭을 지어보세요.',
    required: true
  },
  {
    step: 2,
    key: 'purpose',
    label: '2. 해결하려는 행정 문제와 목적',
    placeholder: '예: 매달 반복되는 출장비 계산의 오류를 줄이고 결재 문구를 자동 생성하기 위함',
    help: '기존 업무에서 어떤 불편함이 있었는지 1~2문장으로 설명합니다.',
    required: true
  },
  {
    step: 3,
    key: 'targetUser',
    label: '3. 주요 사용자',
    placeholder: '예: 출장 품의를 작성하는 지자체 직원, 구청을 방문한 민원인',
    help: '사용자의 연령대, 직무, IT 숙련도 등을 구체적으로 명시하면 좋습니다.',
    required: true
  },
  {
    step: 4,
    key: 'screens',
    label: '4. 필요한 화면 구성',
    placeholder: '예: 상단 헤더(제목 및 리셋 버튼), 좌측 입력 폼, 우측 실시간 결과 카드 및 복사 버튼',
    help: '화면의 구역(헤더, 입력창, 결과창 등)을 머릿속에 그리며 적어주세요.',
    required: true
  },
  {
    step: 5,
    key: 'features',
    label: '5. 핵심 기능 (3~5가지)',
    placeholder: '예: 1) 관내/관외 선택, 2) 시간별 일비 자동 계산, 3) 품의서 양식 텍스트 복사, 4) 초기화',
    help: '버튼을 눌렀을 때 일어날 구체적인 동작을 번호를 매겨 적어주세요.',
    required: true
  },
  {
    step: 6,
    key: 'dataFields',
    label: '6. 입력하거나 보여줄 데이터 항목',
    placeholder: '예: 출장일자, 목적지, 출발/도착 시간, 공용차량 이용 여부, 산출 금액',
    help: '사용자가 직접 입력할 항목과 결과로 표시될 항목을 나열하세요.',
    required: false
  },
  {
    step: 7,
    key: 'designVibe',
    label: '7. 원하는 디자인 분위기',
    type: 'select',
    options: [
      { value: '공공기관 신뢰감을 주는 단정한 딥네이비 & 화이트 톤', text: '🏛️ 공공 신뢰 딥네이비 (추천)' },
      { value: '산뜻하고 현대적인 청록(Teal) & 에메랄드 톤', text: '🌿 산뜻한 에메랄드/청록' },
      { value: '눈이 편안하고 모던한 미니멀 슬레이트 그레이 톤', text: '💼 차분한 미니멀 슬레이트' },
      { value: '야간 근무 및 눈부심 방지를 위한 다크 모드 톤', text: '🌙 야간 업무용 다크 모드' }
    ],
    help: '공공 업무에 어울리는 색상과 분위기를 선택하세요.'
  },
  {
    step: 8,
    key: 'mobileSupport',
    label: '8. 모바일(스마트폰) 지원 여부',
    type: 'select',
    options: [
      { value: '스마트폰 화면에서도 가로 스크롤 없이 완벽히 동작하는 반응형 웹', text: '📱 모바일 + PC 완벽 지원 (강력 추천)' },
      { value: 'PC 모니터 화면에 최적화된 넓은 대시보드 레이아웃', text: '💻 PC 전용 대시보드' }
    ],
    help: '현장 출장이나 이동 중에도 쓸 도구라면 모바일 지원을 선택하세요.'
  },
  {
    step: 9,
    key: 'storageType',
    label: '9. 데이터 저장 방식',
    type: 'select',
    options: [
      { value: '현재 브라우저에 영구 저장 (localStorage 활용, 새로고침해도 데이터 유지)', text: '💾 현재 브라우저에 저장 (추천, 개인용)' },
      { value: '저장하지 않음 (브라우저를 닫으면 초기화되는 1회성 계산기)', text: '⚡ 1회성 도구 (저장 안 함)' },
      { value: '여러 사용자·기기 간 실시간 공유 필요 (향후 Firebase/Supabase 클라우드 DB 연동 명세 포함)', text: '🌐 여러 직원 간 동시 공유 (서버/DB 필요)' }
    ],
    help: '주의: 브라우저 저장은 내 PC에만 보관됩니다. 동료와 공유하려면 클라우드 DB가 필요합니다.'
  },
  {
    step: 10,
    key: 'doneChecklist',
    label: '10. 완성 후 확인할 완료 조건',
    placeholder: '예: 필수 입력란이 비었을 때 경고창 표시, 복사 완료 토스트 알림 노출, 새로고침 시 데이터 유지',
    help: '제작이 끝난 뒤 정상 작동을 판별할 기준 1~2가지를 적어주세요.',
    required: false
  }
];

// 10단계 입력을 바탕으로 완성된 구조화 프롬프트 조합 함수
function buildStructuredPrompt(formData) {
  const isMultiUser = formData.storageType && formData.storageType.includes('실시간 공유');

  return `너는 공공기관용 단일 페이지 인터랙티브 웹앱을 전문으로 만드는 시니어 풀스택 개발자야.
아래의 행정 업무 요구사항 명세를 100% 충족하는 완성된 단일 HTML(index.html) 웹앱을 작성해 줘.

=======================================================
[1. 서비스 개요 및 목적]
- 서비스 명칭: ${formData.appName || '스마트 행정 업무 도구'}
- 해결하려는 문제/목적: ${formData.purpose || '행정 실무 편의성 향상'}
- 대상 사용자: ${formData.targetUser || '공공기관 임직원 및 주민'}

[2. 화면 구성 및 레이아웃]
${formData.screens || '상단 헤더, 메인 입력 폼, 실시간 결과 카드'}

[3. 핵심 기능 동작 규칙]
${formData.features || '입력값 계산, 화면 갱신, 복사 기능'}

[4. 입출력 데이터 항목]
${formData.dataFields || '업무 관련 텍스트 및 수치 데이터'}

[5. 디자인 및 UI 기준]
- 디자인 스타일: ${formData.designVibe || '공공기관 신뢰감을 주는 단정한 딥네이비 & 화이트 톤'}
- 디바이스 지원: ${formData.mobileSupport || '스마트폰 화면에서도 가로 스크롤 없이 완벽히 동작하는 반응형 웹'}
- 프레임워크: 별도 빌드 도구 없이 브라우저에서 바로 동작하도록 Tailwind CSS CDN(<script src="https://cdn.tailwindcss.com"></script>)을 활용할 것
- 기본 폰트 크기: 본문 16px 이상, 충분한 여백(padding)과 줄 간격(leading-relaxed) 유지

[6. 데이터 저장 및 관리 방식]
- 저장 방식: ${formData.storageType || '현재 브라우저에 영구 저장 (localStorage)'}
${isMultiUser ? `* 주의: 본 도구는 다자간 실시간 공유를 지향하므로, 현재는 브라우저 로컬 저장으로 프로토타이핑하되 향후 백엔드(Firebase/Supabase) API 연동이 용이하도록 데이터 모델 객체를 모듈화해 둘 것.` : `* 새로고침(F5)을 해도 입력한 데이터가 사라지지 않도록 localStorage에 자동 동기화할 것.`}

[7. 품질 및 예외 처리 검증 조건]
${formData.doneChecklist || '- 필수 입력란 빈칸 방지 알림\n- 복사 버튼 클릭 시 클립보드 복사 및 완료 토스트 알림\n- 콘솔 에러 0건 유지'}
=======================================================

[구현 요청사항]
- 외부 파일 분할 없이, HTML + CSS + 바닐라 JavaScript가 완벽히 내장된 단 1개의 'index.html' 파일 코드로 출력하라.
- 코드 중간에 생략(// 기존 코드 생략 등)하지 말고 즉시 실행 가능한 100% 완전한 코드를 작성하라.`;
}



/* ==========================================================================
 * [모듈 로드] data/toolsData.js
 * ========================================================================== */

/**
 * 스마트 행정혁신 AI 러닝랩 - 바이브코딩 도구, 공식 레퍼런스, 10대 용어사전
 * 
 * [초보자 설명]
 * 이 파일은 바이브코딩 실습에 필요한 공인 도구 목록 6종,
 * 커리큘럼에서 엄선한 공식 학습 사이트 4선, 그리고 비개발자 공무원의
 * 눈높이에 맞춰 행정 실무에 빗대어 설명한 10대 웹 테크 용어사전 데이터입니다.
 */

// 1. 바이브코딩 핵심 도구 카드 6종
const TOOLS_DATA = [
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
const OFFICIAL_REFERENCES = [
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
const GLOSSARY_DATA = [
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



/* ==========================================================================
 * [모듈 로드] data/missionData.js
 * ========================================================================== */

/**
 * 스마트 행정혁신 AI 러닝랩 - 4대 실전 만들기 미션 데이터
 * 
 * [초보자 설명]
 * 이 파일은 학습자가 AI Studio에서 직접 웹도구를 만들어보는 핸즈온 미션 데이터입니다.
 * 3개의 필수 미션(동아리 소개, 체크리스트, 퀴즈)과 1개의 자율 선택 미션으로 구성되며,
 * 시작 프롬프트, 수정 프롬프트, 5단계 자가점검 체크리스트, 3단 회고 저장 양식을 포함합니다.
 */

const MISSIONS_DATA = [
  {
    id: 'mission_1',
    number: 1,
    title: '미션 1. 우리 연구동아리 소개 사이트',
    difficulty: '입문',
    timeEstimate: '35분',
    isRequired: true,
    badgeAward: 'first_maker',
    xpAward: 50,
    tagline: '동아리 소개, 학습 주제, 활동 일정, FAQ를 담은 모던 웹 랜딩페이지 제작',
    goals: [
      '단일 HTML 구조와 헤더, 섹션, 푸터의 레이아웃 흐름을 체득한다.',
      'Google AI Studio에서 시작 프롬프트로 첫 웹페이지를 생성하고 즉시 확인한다.',
      'FAQ 아코디언 토글 클릭 인터랙션이 정상 작동하는지 점검한다.'
    ],
    features: [
      '동아리 비전 및 핵심 가치 3대 카드',
      '월별 학습 및 세미나 일정 타임라인',
      '자주 묻는 질문(FAQ) 클릭 시 펼쳐지는 인터랙션',
      '모바일 화면에서도 깨짐 없는 깔끔한 반응형 레이아웃'
    ],
    startPrompt: `너는 공공기관 웹서비스 전문 프런트엔드 개발자야.
'스마트 행정혁신 연구동아리 공식 소개 사이트'를 단일 index.html 파일로 완벽하게 제작해 줘.

[화면 구성 및 레이아웃]
1. 헤더: 동아리 로고 텍스트, '소개', '학습주제', '일정', 'FAQ' 네비게이션
2. 히어로 배너: "AI로 혁신하는 공공행정의 미래" 메인 카피와 '활동 참여하기' 버튼
3. 핵심 가치 카드: 1) AI 역량 강화, 2) 실무 웹도구 자체 제작, 3) 일하는 방식 혁신
4. 2026 연간 캘린더: 상반기 월별 세미나 일정표
5. FAQ 아코디언: "코딩 초보자도 배울 수 있나요?" 등 질문 3개와 클릭 시 열리는 답변
6. 푸터: 저작권 문구 및 문의처

[디자인 & 기술 규격]
- Tailwind CSS CDN 적용, 신뢰감을 주는 딥네이비(#0f172a)와 청록색(#0d9488) 포인트
- 한글 본문 16px 이상, line-height 1.7 유지
- 외부 JS 라이브러리 없이 순수 바닐라 JavaScript로 FAQ 토글 구현`,
    stepByStepGuide: [
      '1단계: 위의 [시작 프롬프트 복사] 버튼을 클릭합니다.',
      '2단계: [Google AI Studio 열기] 버튼을 눌러 새 탭에서 AI Studio에 접속합니다.',
      '3단계: AI Studio의 프롬프트 창에 붙여넣고 [Run]을 눌러 코드를 생성합니다.',
      '4단계: 우측 미리보기(Preview) 창에서 메뉴 스크롤과 FAQ 클릭이 잘 되는지 테스트합니다.',
      '5단계: 아래의 5가지 완료 체크리스트를 하나씩 직접 확인하며 체크합니다.'
    ],
    additionPrompt: `FAQ 섹션에 실시간 검색창을 추가해 줘.
사용자가 검색창에 단어를 입력하면, 질문 제목에 해당 단어가 포함된 FAQ 항목만 실시간으로 필터링되어 보이게 해줘.`,
    debugPrompt: `스마트폰 화면에서 볼 때 네비게이션 메뉴 글자가 겹쳐서 보입니다.
모바일 화면에서는 메뉴가 세로로 정렬되거나 간격이 충분히 확보되도록 반응형 CSS 클래스를 보강해 줘.`,
    checklist: [
      '상단 메뉴를 클릭했을 때 해당 위치로 자연스럽게 이동하는가?',
      'FAQ 질문을 클릭했을 때 답변이 부드럽게 펼쳐지고 다시 접히는가?',
      '스마트폰 크기로 화면을 좁혔을 때 가로 스크롤이나 글자 겹침이 없는가?',
      '동아리 소개 카드의 폰트가 흐리지 않고 또렷하게 읽히는가?',
      '브라우저 개발자도구(F12) 콘솔 창에 빨간색 에러 메시지가 없는가?'
    ]
  },

  {
    id: 'mission_2',
    number: 2,
    title: '미션 2. 행정업무 체크리스트',
    difficulty: '기초',
    timeEstimate: '45분',
    isRequired: true,
    badgeAward: 'first_maker',
    xpAward: 50,
    tagline: '업무 추가/수정/삭제 및 새로고침해도 데이터가 보존되는 스마트 업무 수첩',
    goals: [
      '입력 폼(Form)에서 사용자가 입력한 데이터를 목록에 동적으로 추가하는 로직을 이해한다.',
      '브라우저의 localStorage를 연동하여 새로고침(F5) 시에도 데이터가 유지되게 만든다.',
      '빈 값 입력 방지 및 삭제 전 확인 등 실무 예외 처리(Validation)를 경험한다.'
    ],
    features: [
      '업무명, 우선순위(긴급/일반), 마감시간 입력 폼',
      '체크 시 완료 취소선 및 완료 건수 카운팅',
      'localStorage를 이용한 데이터 자동 영구 저장',
      '오늘의 업무 일지 양식 텍스트 1초 복사 버튼'
    ],
    startPrompt: `너는 개인 업무 생산성 도구 전문 풀스택 개발자야.
'공무원 일일 스마트 업무 체크리스트' 웹앱을 단일 index.html 파일로 완성해 줘.

[필수 구현 기능]
1. 업무 등록 폼: 업무 내용 텍스트 입력창, 우선순위([긴급], [보통]) 선택 드롭다운, [추가] 버튼
2. 유효성 검사: 업무 내용을 입력하지 않고 추가를 누르면 "업무 내용을 입력해 주세요" 경고창 표시
3. 목록 표시 및 인터랙션:
   - 체크박스 클릭 시 업무명에 취소선이 그어지며 완료 상태로 변경
   - 각 항목 우측에 [삭제] 버튼 제공
4. 통계 바: "전체 N건 중 M건 완료 (진행률 X%)" 실시간 게이지
5. 영구 저장: 등록, 삭제, 체크 상태 변경 시 브라우저의 localStorage('MY_GOV_TASKS')에 자동 저장되어 페이지 새로고침 후에도 그대로 복원될 것
6. 스타일: Tailwind CSS 기반 단정하고 차분한 슬레이트 블루 톤`,
    stepByStepGuide: [
      '1단계: [시작 프롬프트 복사]를 누르고 Google AI Studio로 이동합니다.',
      '2단계: 프롬프트를 실행하여 웹앱 코드를 생성합니다.',
      '3단계: 새로운 업무를 3개 직접 입력하고, 1개를 완료 체크해 봅니다.',
      '4단계: 브라우저 새로고침(F5)을 눌러 등록한 업무가 사라지지 않는지 확인합니다.',
      '5단계: 체크리스트를 확인하고 결과와 회고를 저장합니다.'
    ],
    additionPrompt: `목록 상단에 [전체 보기], [미완료 업무만], [완료된 업무만] 볼 수 있는 3개의 탭 필터 버튼을 추가해 줘.`,
    debugPrompt: `새로고침을 하니 이전에 등록했던 업무 목록이 빈 화면으로 초기화됩니다.
페이지가 열릴 때 localStorage.getItem('MY_GOV_TASKS')를 읽어와서 화면에 목록을 렌더링하는 초기화 함수가 window.onload 시점에 반드시 실행되도록 수정해 줘.`,
    checklist: [
      '업무명에 빈칸을 두고 추가 버튼을 눌렀을 때 경고창이 뜨며 등록이 차단되는가?',
      '체크박스를 눌렀을 때 취소선과 함께 진행률(%)이 즉시 갱신되는가?',
      'F5 새로고침을 해도 등록했던 업무 목록과 체크 상태가 그대로 유지되는가?',
      '삭제 버튼을 눌렀을 때 해당 업무 항목이 목록과 저장소에서 완전히 지워지는가?',
      '모바일 화면에서도 입력창과 버튼이 터치하기 알맞은 크기로 배치되었는가?'
    ]
  },

  {
    id: 'mission_3',
    number: 3,
    title: '미션 3. AI 기초 퀴즈 사이트',
    difficulty: '기초~중급',
    timeEstimate: '50분',
    isRequired: true,
    badgeAward: 'first_maker',
    xpAward: 50,
    tagline: '문제 제시, 즉각 채점, 해설 노출, 최종 점수 합산 및 다시 풀기 완결형 퀴즈 앱',
    goals: [
      '배열(Array) 형태의 퀴즈 데이터를 한 문제씩 화면에 카드 형태로 렌더링한다.',
      '정답/오답 클릭에 따른 피드백 박스와 점수 누적 연산 상태를 관리한다.',
      '모든 문항 완료 시 결과 리포트 화면으로 전환되는 페이지 상태 흐름을 구축한다.'
    ],
    features: [
      '1문항씩 집중해서 푸는 슬라이드 카드 뷰',
      '보기 클릭 시 즉시 정답(녹색)/오답(적색) 색상 표시 및 친절한 해설 노출',
      '중복 점수 획득 방지 (문제당 1회만 정답 인정)',
      '최종 점수 리포트 및 틀린 문제 다시 풀기'
    ],
    startPrompt: `너는 공공 교육 게이미피케이션 전문 개발자야.
'공공 생성형 AI 기초 상식 퀴즈 웹앱'을 단일 index.html 파일로 만들어 줘.

[데이터 및 퀴즈 구성]
- 공공 AI 보안, 환각 현상, 프롬프트 원칙과 관련된 4지선다형 퀴즈 5문항 내장

[화면 및 인터랙션 흐름]
1. 문제 카드 화면:
   - 상단 진행률 바 (예: 문제 2 / 5)
   - 질문 텍스트 및 4개의 선택지 버튼
2. 채점 인터랙션:
   - 선택지 클릭 시 즉시 정답 여부 판정 (정답 선택지는 초록색, 오답은 빨간색으로 하이라이트)
   - 하단에 [정답 해설 박스]가 스르륵 나타남
   - [다음 문제로 이동] 버튼 활성화
3. 최종 결과 화면:
   - 100점 만점 환산 점수 및 성취 등급(예: 80점 이상 'AI 행정 마스터')
   - '처음부터 다시 풀기' 버튼 클릭 시 1번 문제로 초기화`,
    stepByStepGuide: [
      '1단계: [시작 프롬프트 복사] 후 Google AI Studio에서 코드를 생성합니다.',
      '2단계: 1번 문제부터 5번 문제까지 차례대로 풀어봅니다.',
      '3단계: 오답을 골랐을 때 빨간색 표시와 함께 해설이 잘 나오는지 확인합니다.',
      '4단계: 마지막 문제 제출 후 결과 화면에서 점수가 정확히 100점 기준으로 환산되는지 점검합니다.',
      '5단계: 체크리스트를 확인하고 학습 회고를 등록합니다.'
    ],
    additionPrompt: `최종 결과 화면에 내가 틀렸던 문제들의 질문과 정답만 한눈에 모아서 복습할 수 있는 '오답 다시 보기 카드'를 추가해 줘.`,
    debugPrompt: `선택지 버튼을 여러 번 연속으로 클릭하면 점수가 20점, 40점씩 중복으로 올라갑니다.
한 번 보기를 선택하면 다른 버튼들이 비활성화(disabled)되어 점수가 중복 합산되지 않도록 방어 코드를 넣어줘.`,
    checklist: [
      '보기를 클릭했을 때 즉시 정답/오답 색상 피드백과 해설이 나타나는가?',
      '보기를 여러 번 연타해도 점수가 중복으로 합산되지 않는가?',
      '다음 문제 버튼을 누르기 전에는 임의로 다음 문제로 넘어가지 않는가?',
      '5문제를 모두 풀면 결과 화면으로 부드럽게 전환되는가?',
      '다시 풀기를 눌렀을 때 점수와 진행률이 0부터 정상 초기화되는가?'
    ]
  },

  {
    id: 'mission_custom',
    number: 4,
    title: '선택 미션. 나의 행정혁신 아이디어 웹앱',
    difficulty: '자유',
    timeEstimate: '60분',
    isRequired: false,
    badgeAward: 'first_maker',
    xpAward: 50,
    tagline: '출장비 계산기, 큐시트 생성기 등 내 부서의 실제 현안 문제를 직접 기획하고 해결',
    goals: [
      '내 부서에서 평소 가장 비효율적이거나 불편했던 행정 업무 1가지를 선정한다.',
      '우리 사이트 [프롬프트 실습실]의 10단계 마법사 또는 핸즈온 5선 템플릿을 활용해 맞춤형 프롬프트를 완성한다.',
      '자신만의 가상 데이터를 적용하여 실제로 동작하는 도구를 완성하고 회고를 기록한다.'
    ],
    features: [
      '해결할 문제 1개에 집중한 3대 핵심 기능',
      '실무 규정(여비조례, 민원지침 등)이 반영된 계산 및 텍스트 자동 생성',
      '결재 품의문 복사 또는 파일 다운로드 지원',
      '동아리 성과공유회에서 시연 가능한 완성도'
    ],
    startPrompt: `(이 미션은 좌측 메뉴 [프롬프트 실습실]에서 '10단계 맞춤형 프롬프트 만들기'를 통해 생성된 나만의 고유 프롬프트 또는 '핸즈온 프로젝트 5선' 중 하나를 선택하여 진행합니다)`,
    stepByStepGuide: [
      '1단계: 좌측 메뉴의 [프롬프트 실습실]로 이동합니다.',
      '2단계: [10단계 프롬프트 빌더]를 채우거나 [핸즈온 5선] 중 내 업무에 맞는 과제를 선택합니다.',
      '3단계: 완성된 맞춤형 프롬프트를 복사하여 Google AI Studio에서 제작합니다.',
      '4단계: 내 업무에 필요한 예시 데이터를 넣고 동작을 꼼꼼히 점검합니다.',
      '5단계: 결과 URL 또는 제작 메모와 함께 3단 회고(배운점, 어려웠던점, 개선점)를 등록합니다.'
    ],
    additionPrompt: `사용자가 생성된 결과 텍스트를 바로 인쇄(Ctrl+P)할 수 있도록 깔끔한 인쇄용 서식(@media print)을 추가해 줘.`,
    debugPrompt: `입력창에 숫자가 아닌 한글이나 특수문자가 들어갔을 때 계산이 NaN(Not a Number)으로 깨집니다.
숫자만 입력되도록 방어하고 유효한 숫자가 아닐 때는 '올바른 숫자를 입력하세요' 문구를 띄워줘.`,
    checklist: [
      '해결하려는 행정 목표 1가지가 명확히 달성되는가?',
      '입력창의 예외 값(빈칸, 비정상 문자)에 대한 오류 안내가 작동하는가?',
      '결과를 복사하거나 저장할 수 있는 편의 기능이 갖춰져 있는가?',
      '다른 동료 직원이 보았을 때 설명 없이도 직관적으로 사용할 수 있는가?',
      '제작 후 배운 점과 향후 발전 계획을 3단 회고에 충실히 기록하였는가?'
    ]
  }
];



/* ==========================================================================
 * [모듈 로드] app.js
 * ========================================================================== */

/**
 * 스마트 행정혁신 AI 러닝랩 - 메인 애플리케이션 컨트롤러
 * 
 * [초보자 설명]
 * 이 스크립트는 웹사이트의 모든 화면 전환(7대 메뉴), 퀴즈 채점,
 * 프롬프트 조합 마법사, 미션 자가 점검 및 회고 저장, 데이터 백업/복원을
 * 총괄하는 핵심 지휘부입니다.
 */








class AppController {
  constructor() {
    this.currentTab = 'home';
    this.currentLessonId = 'lesson_1';
    this.currentQuizSubtab = 'daily';
    this.currentPromptSubtab = 'builder';
    
    // 프롬프트 빌더 임시 폼 상태
    this.builderFormData = {
      appName: '공무원 여비 자동 계산기',
      purpose: '출장 품의 작성 시 4시간 기준 일비와 식비 감액 규칙을 자동 계산하여 업무 시간을 단축하기 위함',
      targetUser: '지자체 및 공공기관 출장 품의 담당 직원',
      screens: '상단 헤더(제목, 리셋 버튼), 좌측 입력 폼(관내/관외, 시간, 공용차량 여부), 우측 품의서 복사용 결과 카드',
      features: '1) 관내/관외 탭 선택, 2) 4시간 이상 2만원/미만 1만원 자동 분기, 3) 공용차량 이용 시 일비 1만원 감액, 4) 결재문구 1초 복사 버튼',
      dataFields: '출장일자, 목적지, 출발/도착 시간, 공용차량 여부, 최종 산출 여비액',
      designVibe: '공공기관 신뢰감을 주는 단정한 딥네이비 & 화이트 톤',
      mobileSupport: '스마트폰 화면에서도 가로 스크롤 없이 완벽히 동작하는 반응형 웹',
      storageType: '현재 브라우저에 영구 저장 (localStorage 활용, 새로고침해도 데이터 유지)',
      doneChecklist: '- 미입력 시 경고창 표시\n- 복사 버튼 클릭 시 클립보드 복사 알림\n- 새로고침 시 데이터 유지'
    };

    this.dailyQuizIds = [];
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupStorageEvents();
    this.pickDailyQuizzes();
    this.handleRouting();
    this.updateGlobalStats();
  }

  // 브라우저 해시 라우팅 처리
  handleRouting() {
    const hash = window.location.hash.replace('#', '') || 'home';
    const [tab, subId] = hash.split('/');
    
    const validTabs = ['home', 'course', 'quiz', 'vibe', 'prompt', 'mission', 'my-learning'];
    if (validTabs.includes(tab)) {
      this.switchTab(tab, subId);
    } else {
      this.switchTab('home');
    }
  }

  // 이벤트 리스너 등록
  setupEventListeners() {
    // 사이드바 메뉴 클릭
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const tab = item.getAttribute('data-tab');
        window.location.hash = tab;
      });
    });

    // 모바일 햄버거 토글
    const mobileBtn = document.getElementById('mobile-toggle-btn');
    const sidebar = document.getElementById('app-sidebar');
    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
      // 본문 클릭 시 사이드바 닫기
      document.querySelector('.app-main').addEventListener('click', () => {
        sidebar.classList.remove('open');
      });
    }

    // 히어로 배너 버튼
    const btnHeroStart = document.getElementById('btn-hero-start');
    if (btnHeroStart) {
      btnHeroStart.addEventListener('click', () => {
        window.location.hash = 'course';
      });
    }
    const btnHeroPrompt = document.getElementById('btn-hero-prompt');
    if (btnHeroPrompt) {
      btnHeroPrompt.addEventListener('click', () => {
        window.location.hash = 'prompt';
      });
    }
    const btnStartDailyQuiz = document.getElementById('btn-start-daily-quiz');
    if (btnStartDailyQuiz) {
      btnStartDailyQuiz.addEventListener('click', () => {
        this.currentQuizSubtab = 'daily';
        window.location.hash = 'quiz';
      });
    }

    // 해시 변경 감지
    window.addEventListener('hashchange', () => {
      this.handleRouting();
    });

    // 퀴즈 서브탭 전환
    document.querySelectorAll('.quiz-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const parent = btn.closest('.quiz-tabs') || btn.closest('.prompt-lab-tabs');
        if (parent) {
          parent.querySelectorAll('.quiz-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const subtab = btn.getAttribute('data-subtab');
          if (parent.classList.contains('quiz-tabs')) {
            this.currentQuizSubtab = subtab;
            this.renderQuiz();
          } else if (parent.classList.contains('prompt-lab-tabs')) {
            this.currentPromptSubtab = subtab;
            this.renderPrompt();
          }
        }
      });
    });

    // 오답 노트 바로가기
    const btnGoWrong = document.getElementById('btn-go-wrong-notes');
    if (btnGoWrong) {
      btnGoWrong.addEventListener('click', () => {
        this.currentQuizSubtab = 'wrong-review';
        window.location.hash = 'quiz';
      });
    }

    // JSON 내보내기 & 가져오기 & 초기화
    const btnExport = document.getElementById('btn-export-json');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        storageManager.exportToJSON();
        this.showToast('학습 기록 백업 파일(.json)이 다운로드되었습니다.', 'success');
      });
    }

    const fileImport = document.getElementById('file-import-json');
    if (fileImport) {
      fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const res = storageManager.importFromJSON(event.target.result);
          if (res.success) {
            this.showToast('학습 기록을 성공적으로 복원하였습니다!', 'success');
            this.updateGlobalStats();
            this.renderCurrentTab();
          } else {
            alert('가져오기 실패: ' + res.message);
          }
        };
        reader.readAsText(file);
      });
    }

    const btnReset = document.getElementById('btn-reset-data');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('주의: 모든 학습 진도, 퀴즈 기록, 경험치가 초기화됩니다.\n정말 초기화하시겠습니까?')) {
          storageManager.resetAllData();
          this.showToast('모든 학습 데이터가 초기화되었습니다.', 'info');
          this.updateGlobalStats();
          this.renderCurrentTab();
        }
      });
    }
  }

  // 스토리지 커스텀 이벤트 처리
  setupStorageEvents() {
    window.addEventListener('learning-state-updated', () => {
      this.updateGlobalStats();
    });

    window.addEventListener('badge-earned', (e) => {
      const badge = e.detail;
      this.showToast(`🎉 새로운 성취 배지 획득! [${badge.name}] (${badge.icon})`, 'success');
    });
  }

  // 오늘의 5문제 랜덤 추천 뽑기 (48개 중 5개)
  pickDailyQuizzes() {
    const shuffled = [...QUIZ_DATA].sort(() => 0.5 - Math.random());
    this.dailyQuizIds = shuffled.slice(0, 5).map(q => q.id);
  }

  // 탭 전환 메인 함수
  switchTab(tabName, subId) {
    this.currentTab = tabName;

    // 사이드바 활성 스타일
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-tab') === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // 탭 페이지 숨김/노출
    document.querySelectorAll('.tab-page').forEach(page => {
      if (page.id === `tab-${tabName}`) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });

    // 서브 ID 처리 (코스 차시 등)
    if (tabName === 'course' && subId) {
      this.currentLessonId = subId;
    }

    // 각 탭별 렌더링 호출
    this.renderCurrentTab();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderCurrentTab() {
    switch (this.currentTab) {
      case 'home':
        this.renderHome();
        break;
      case 'course':
        this.renderCourse();
        break;
      case 'quiz':
        this.renderQuiz();
        break;
      case 'vibe':
        this.renderVibe();
        break;
      case 'prompt':
        this.renderPrompt();
        break;
      case 'mission':
        this.renderMission();
        break;
      case 'my-learning':
        this.renderMyLearning();
        break;
    }
    this.updateGlobalStats();
  }

  // 토스트 메시지 표시
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>🔔</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // 클립보드 텍스트 복사 헬퍼
  copyToClipboard(text, successMessage = '클립보드에 복사되었습니다!') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(successMessage, 'success');
      }).catch(() => {
        this.fallbackCopy(text, successMessage);
      });
    } else {
      this.fallbackCopy(text, successMessage);
    }
  }

  fallbackCopy(text, successMessage) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      this.showToast(successMessage, 'success');
    } catch (err) {
      alert('복사에 실패했습니다. 아래 텍스트를 직접 드래그하여 복사하세요:\n\n' + text);
    }
    document.body.removeChild(textArea);
  }

  // 전역 통계 및 사이드바 갱신
  updateGlobalStats() {
    const state = storageManager.getState();
    const levelInfo = storageManager.getCurrentLevel();

    // 사이드바 레벨
    const sbTitle = document.getElementById('sb-level-title');
    const sbXP = document.getElementById('sb-level-xp');
    const sbFill = document.getElementById('sb-level-fill');
    const sbNext = document.getElementById('sb-next-tier');
    const sbPercent = document.getElementById('sb-percent-text');

    if (sbTitle) sbTitle.innerHTML = `${levelInfo.currentLevel.icon} ${levelInfo.currentLevel.title}`;
    if (sbXP) sbXP.textContent = `${levelInfo.xp} XP`;
    if (sbFill) sbFill.style.width = `${levelInfo.progressPercent}%`;
    if (sbNext) sbNext.textContent = levelInfo.nextLevel ? `다음: ${levelInfo.nextLevel.title}` : '최고 레벨 달성';
    if (sbPercent) sbPercent.textContent = `${levelInfo.progressPercent}%`;

    // 모바일 탑바 XP
    const mobXP = document.getElementById('mobile-xp-badge');
    if (mobXP) mobXP.textContent = `${levelInfo.xp} XP`;

    // 차시 배지 카운터
    const courseCount = document.getElementById('badge-course-count');
    if (courseCount) courseCount.textContent = `${state.completedLessons.length}/16`;

    // 오답 배지 카운터
    const wrongCount = document.getElementById('badge-wrong-count');
    if (wrongCount) {
      if (state.wrongQuestions.length > 0) {
        wrongCount.style.display = 'inline-block';
        wrongCount.textContent = `${state.wrongQuestions.length}개 오답`;
      } else {
        wrongCount.style.display = 'none';
      }
    }

    // 미션 배지 카운터
    const missionCount = document.getElementById('badge-mission-count');
    if (missionCount) {
      const subCount = Object.keys(state.missionSubmissions || {}).length;
      missionCount.textContent = `${subCount}/4`;
    }
  }

  // ================= 1. 홈 대시보드 렌더링 =================
  renderHome() {
    const state = storageManager.getState();
    const completedCount = state.completedLessons.length;
    const progressRate = Math.round((completedCount / 16) * 100);

    const statLesson = document.getElementById('dash-lesson-stat');
    if (statLesson) statLesson.textContent = `${completedCount} / 16 차시 (${progressRate}%)`;

    const statXP = document.getElementById('dash-xp-stat');
    if (statXP) statXP.textContent = `${state.earnedXP} XP`;

    let correctCount = 0;
    Object.values(state.quizHistory || {}).forEach(h => {
      if (h.isCorrect) correctCount++;
    });
    const statQuiz = document.getElementById('dash-quiz-stat');
    if (statQuiz) statQuiz.textContent = `${correctCount} / 48 문제`;

    const statBadge = document.getElementById('dash-badge-stat');
    if (statBadge) statBadge.textContent = `${state.badges.length} / 6 개`;

    // 이어서 학습할 차시 도출
    const resumeContainer = document.getElementById('home-resume-container');
    if (resumeContainer) {
      // 미완료된 가장 첫 번째 차시 찾기
      const nextLesson = CURRICULUM_DATA.find(l => !state.completedLessons.includes(l.id)) || CURRICULUM_DATA[0];

      resumeContainer.innerHTML = `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0;">
          <div style="display: flex; gap: 8px; margin-bottom: 6px;">
            <span class="badge-tag time">⏱️ ${nextLesson.time}</span>
            <span class="badge-tag level">🌱 ${nextLesson.level}</span>
            <span class="badge-tag" style="background:#ccfbf1; color:#0f766e;">${nextLesson.moduleTitle}</span>
          </div>
          <h4 style="font-size: 16px; font-weight: 800; color: var(--primary-slate); margin-bottom: 8px;">
            ${nextLesson.lessonNumber}차시: ${nextLesson.title}
          </h4>
          <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 14px;">
            ${nextLesson.objectives[0]}
          </p>
          <button class="btn btn-primary btn-sm" id="btn-resume-lesson" data-lesson-id="${nextLesson.id}">
            <span>▶️ ${state.completedLessons.includes(nextLesson.id) ? '다시 학습하기' : '이어서 학습하기'}</span>
          </button>
        </div>
      `;

      document.getElementById('btn-resume-lesson').addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-lesson-id');
        this.currentLessonId = id;
        window.location.hash = `course/${id}`;
      });
    }
  }

  // ================= 2. AI 학습 코스 렌더링 =================
  renderCourse() {
    const state = storageManager.getState();
    const navContainer = document.getElementById('curriculum-list-container');
    const viewer = document.getElementById('lesson-viewer');

    if (!navContainer || !viewer) return;

    // 1) 좌측 목차 렌더링
    let navHTML = '';
    const weeks = [1, 2, 3, 4];
    weeks.forEach(w => {
      const lessonsInWeek = CURRICULUM_DATA.filter(l => l.week === w);
      const weekTitles = {
        1: '1주차: AI 이해와 기본 활용',
        2: '2주차: 행정업무 적용 & 안전 활용',
        3: '3주차: 바이브코딩 & 제작 도구',
        4: '4주차: 프롬프트로 웹도구 제작'
      };

      navHTML += `
        <div class="week-group">
          <div class="week-title">${weekTitles[w]}</div>
      `;

      lessonsInWeek.forEach(lesson => {
        const isDone = state.completedLessons.includes(lesson.id);
        const isActive = lesson.id === this.currentLessonId;
        navHTML += `
          <div class="lesson-list-item ${isActive ? 'active' : ''}" data-lesson-id="${lesson.id}">
            <span class="lesson-check-icon ${isDone ? 'completed' : ''}">${isDone ? '✅' : '⚪'}</span>
            <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${lesson.lessonNumber}. ${lesson.title}
            </span>
          </div>
        `;
      });

      navHTML += `</div>`;
    });

    navContainer.innerHTML = navHTML;

    // 목차 클릭 이벤트
    navContainer.querySelectorAll('.lesson-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-lesson-id');
        this.currentLessonId = id;
        window.location.hash = `course/${id}`;
      });
    });

    // 2) 우측 본문 뷰어 렌더링
    const lesson = CURRICULUM_DATA.find(l => l.id === this.currentLessonId) || CURRICULUM_DATA[0];
    const isCompleted = state.completedLessons.includes(lesson.id);

    // 이전 / 다음 차시 계산
    const currentIndex = CURRICULUM_DATA.findIndex(l => l.id === lesson.id);
    const prevLesson = currentIndex > 0 ? CURRICULUM_DATA[currentIndex - 1] : null;
    const nextLesson = currentIndex < CURRICULUM_DATA.length - 1 ? CURRICULUM_DATA[currentIndex + 1] : null;

    viewer.innerHTML = `
      <div class="lesson-meta-bar">
        <span class="badge-tag time">⏱️ 소요시간 약 ${lesson.time}</span>
        <span class="badge-tag level">난이도: ${lesson.level}</span>
        <span class="badge-tag" style="background:#ccfbf1; color:#0d9488;">${lesson.moduleTitle}</span>
        ${isCompleted ? '<span class="badge-tag status">✓ 학습 완료 (20 XP 획득)</span>' : ''}
      </div>

      <h3 class="lesson-view-title">${lesson.lessonNumber}차시. ${lesson.title}</h3>

      <!-- 1. 학습 목표 -->
      <section class="content-section">
        <h4 class="content-section-title"><span>🎯</span> 1. 이번 차시 학습 목표</h4>
        <ul class="clean-list">
          ${lesson.objectives.map(obj => `<li><strong>${obj}</strong></li>`).join('')}
        </ul>
      </section>

      <!-- 2. 쉬운 개념 설명 -->
      <section class="content-section">
        <h4 class="content-section-title"><span>💡</span> 2. 쉬운 개념 설명</h4>
        ${lesson.concept}
      </section>

      <!-- 3. 가상의 행정업무 사례 -->
      <section class="content-section">
        <h4 class="content-section-title"><span>🏢</span> 3. 가상의 행정 실무 사례</h4>
        <div class="info-card">
          <strong style="color: var(--primary-slate); font-size: 15px; display:block; margin-bottom: 6px;">
            ${lesson.adminCase.title}
          </strong>
          <p style="font-size: 14.5px; color: var(--text-main);">${lesson.adminCase.content}</p>
        </div>
      </section>

      <!-- 4. 좋은 예시 vs 개선이 필요한 예시 -->
      <section class="content-section">
        <h4 class="content-section-title"><span>⚖️</span> 4. 좋은 예시 vs 개선이 필요한 예시</h4>
        <div class="example-compare-grid">
          <div class="example-box good">${lesson.goodCase}</div>
          <div class="example-box bad">${lesson.badCase}</div>
        </div>
        <div class="example-review-box">
          <strong>🔍 실무 해설:</strong> ${lesson.caseReview}
        </div>
      </section>

      <!-- 5. 3분 미니 활동 -->
      <section class="content-section">
        <h4 class="content-section-title"><span>⏱️</span> 5. 3분 내외의 작은 활동</h4>
        <div style="background: white; border: 1px solid var(--border-color); border-radius: 8px; padding: 18px;">
          <h5 style="font-size: 15px; font-weight: 700; color: var(--primary-teal); margin-bottom: 6px;">
            ${lesson.miniActivity.title}
          </h5>
          <p style="font-size: 14.5px; margin-bottom: 10px;">${lesson.miniActivity.instruction}</p>
          <div style="background:#f1f5f9; padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #475569;">
            💡 <strong>힌트/팁:</strong> ${lesson.miniActivity.tip}
          </div>
        </div>
      </section>

      <!-- 6. 핵심 요약 3줄 -->
      <section class="content-section">
        <h4 class="content-section-title"><span>📋</span> 6. 핵심 요약 3줄</h4>
        <div class="summary-box">
          ${lesson.summary3Lines.map(line => `<p>${line}</p>`).join('')}
        </div>
      </section>

      <!-- 7. 복습 퀴즈 3문제 (인라인 풀이 지원) -->
      <section class="content-section">
        <h4 class="content-section-title"><span>❓</span> 7. 이번 차시 복습 퀴즈 (3문제)</h4>
        <div id="lesson-quiz-inline-container">
          <!-- 인라인 퀴즈 렌더링 -->
        </div>
      </section>

      <!-- 네비게이션 버튼 & 완료하기 -->
      <div class="lesson-nav-footer">
        <div>
          ${prevLesson ? `
            <button class="btn btn-secondary" id="btn-lesson-prev" data-id="${prevLesson.id}">
              <span>← ${prevLesson.lessonNumber}차시로</span>
            </button>
          ` : '<span></span>'}
        </div>

        <button class="btn ${isCompleted ? 'btn-secondary' : 'btn-primary'} btn-lg" id="btn-lesson-complete">
          <span>${isCompleted ? '✓ 학습 완료됨 (20 XP 획득완료)' : '🌟 학습 완료하고 20 XP 받기'}</span>
        </button>

        <div>
          ${nextLesson ? `
            <button class="btn btn-secondary" id="btn-lesson-next" data-id="${nextLesson.id}">
              <span>${nextLesson.lessonNumber}차시로 →</span>
            </button>
          ` : '<span></span>'}
        </div>
      </div>
    `;

    // 인라인 퀴즈 3문제 렌더링
    this.renderInlineQuizzes(lesson.quizIds);

    // 이전/다음 버튼 이벤트
    const btnPrev = document.getElementById('btn-lesson-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.currentLessonId = id;
        window.location.hash = `course/${id}`;
      });
    }

    const btnNext = document.getElementById('btn-lesson-next');
    if (btnNext) {
      btnNext.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.currentLessonId = id;
        window.location.hash = `course/${id}`;
      });
    }

    // 완료 버튼 이벤트
    const btnComplete = document.getElementById('btn-lesson-complete');
    if (btnComplete) {
      btnComplete.addEventListener('click', () => {
        const earned = storageManager.completeLesson(lesson.id);
        if (earned) {
          this.showToast(`🎉 ${lesson.lessonNumber}차시 완료! +20 XP를 획득했습니다.`, 'success');
        } else {
          this.showToast('이미 완료된 차시입니다.', 'info');
        }
        this.renderCourse();
      });
    }
  }

  // 본문 하단 인라인 퀴즈 렌더링
  renderInlineQuizzes(quizIds) {
    const container = document.getElementById('lesson-quiz-inline-container');
    if (!container) return;

    const quizzes = QUIZ_DATA.filter(q => quizIds.includes(q.id));
    let html = '';

    quizzes.forEach((quiz, idx) => {
      const state = storageManager.getState();
      const history = state.quizHistory[quiz.id];

      html += `
        <div class="card quiz-card" style="margin-bottom: 16px;" id="inline-quiz-${quiz.id}">
          <div class="quiz-badge-row">
            <span class="badge-tag level">문제 ${idx + 1}</span>
            <span style="font-size: 13px; color: var(--text-muted);">
              ${history && history.isCorrect ? '✅ 정답 기록됨 (+10 XP)' : '미완료'}
            </span>
          </div>
          <h5 class="quiz-question-text" style="font-size: 16px;">${quiz.question}</h5>
          <div class="quiz-options-list">
            ${quiz.options.map((opt, oIdx) => `
              <button class="quiz-opt-btn" data-quiz-id="${quiz.id}" data-opt-index="${oIdx}">
                <span style="color:var(--text-muted); font-size:13px;">${oIdx + 1}.</span>
                <span>${opt}</span>
              </button>
            `).join('')}
          </div>
          <div class="quiz-feedback-box" id="feedback-${quiz.id}"></div>
        </div>
      `;
    });

    container.innerHTML = html;

    // 인라인 보기 클릭 이벤트
    container.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const quizId = btn.getAttribute('data-quiz-id');
        const optIndex = parseInt(btn.getAttribute('data-opt-index'), 10);
        this.handleQuizSubmit(quizId, optIndex, container);
      });
    });
  }

  // ================= 3. 퀴즈 챌린지 렌더링 =================
  renderQuiz() {
    const container = document.getElementById('quiz-content-container');
    if (!container) return;

    // 오답 뱃지 숫자 갱신
    const state = storageManager.getState();
    const wrongTabBadge = document.getElementById('quiz-tab-wrong-count');
    if (wrongTabBadge) {
      wrongTabBadge.textContent = `(${state.wrongQuestions.length})`;
    }

    let targetQuizzes = [];
    let emptyNotice = '';

    if (this.currentQuizSubtab === 'daily') {
      targetQuizzes = QUIZ_DATA.filter(q => this.dailyQuizIds.includes(q.id));
    } else if (this.currentQuizSubtab === 'by-lesson') {
      targetQuizzes = QUIZ_DATA;
    } else if (this.currentQuizSubtab === 'wrong-review') {
      targetQuizzes = QUIZ_DATA.filter(q => state.wrongQuestions.includes(q.id));
      emptyNotice = '현재 틀린 문제가 없습니다! 완벽하게 모든 개념을 이해하셨습니다. 🎉';
    }

    if (targetQuizzes.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 48px;">
          <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
          <h3 style="font-size: 20px; font-weight: 800; color: var(--primary-slate); margin-bottom: 8px;">
            ${emptyNotice || '표시할 퀴즈가 없습니다.'}
          </h3>
          <p style="font-size: 14.5px; color: var(--text-muted); margin-bottom: 20px;">
            다른 서브탭을 선택하여 다양한 퀴즈에 도전해 보세요!
          </p>
          <button class="btn btn-primary" id="btn-quiz-empty-back">
            <span>⚡ 오늘의 5문제 풀러가기</span>
          </button>
        </div>
      `;
      const btnBack = document.getElementById('btn-quiz-empty-back');
      if (btnBack) {
        btnBack.addEventListener('click', () => {
          this.currentQuizSubtab = 'daily';
          this.renderQuiz();
        });
      }
      return;
    }

    let html = '';
    targetQuizzes.forEach((quiz, idx) => {
      const history = state.quizHistory[quiz.id];
      const isReviewed = state.reviewedQuestions.includes(quiz.id);

      html += `
        <div class="card quiz-card" id="quiz-card-${quiz.id}">
          <div class="quiz-badge-row">
            <div style="display:flex; gap:8px; align-items:center;">
              <span class="badge-tag level">Q${idx + 1}</span>
              <span class="badge-tag time">${quiz.lessonId.replace('lesson_', '')}차시 연계</span>
              ${isReviewed ? '<span class="badge-tag status">복습 완료</span>' : ''}
            </div>
            <span style="font-size: 13px; font-weight: 700; color: #d97706;">
              ${history && history.isCorrect ? '✅ 정답 기록됨' : '+10 XP 획득 가능'}
            </span>
          </div>

          <h4 class="quiz-question-text">${quiz.question}</h4>

          <div class="quiz-options-list">
            ${quiz.options.map((opt, oIdx) => `
              <button class="quiz-opt-btn" data-quiz-id="${quiz.id}" data-opt-index="${oIdx}">
                <span style="color:var(--text-muted); font-size:13px;">${oIdx + 1}.</span>
                <span>${opt}</span>
              </button>
            `).join('')}
          </div>

          <div class="quiz-feedback-box" id="feedback-${quiz.id}"></div>
        </div>
      `;
    });

    container.innerHTML = html;

    // 보기 클릭 이벤트
    container.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const quizId = btn.getAttribute('data-quiz-id');
        const optIndex = parseInt(btn.getAttribute('data-opt-index'), 10);
        this.handleQuizSubmit(quizId, optIndex, container);
      });
    });
  }

  // 퀴즈 답안 제출 및 판정 처리 공통 함수
  handleQuizSubmit(quizId, chosenIndex, containerScope) {
    const quiz = QUIZ_DATA.find(q => q.id === quizId);
    if (!quiz) return;

    const isCorrect = chosenIndex === quiz.correctIndex;
    storageManager.recordQuizAttempt(quizId, isCorrect, chosenIndex);

    // 해당 퀴즈 카드 내의 버튼 및 피드백 박스 탐색
    const card = containerScope.querySelector(`#quiz-card-${quizId}`) || containerScope.querySelector(`#inline-quiz-${quizId}`);
    if (!card) return;

    const buttons = card.querySelectorAll('.quiz-opt-btn');
    const feedbackBox = card.querySelector(`#feedback-${quizId}`);

    buttons.forEach((b, idx) => {
      b.disabled = true; // 중복 클릭 방지
      b.classList.remove('correct', 'wrong');
      if (idx === quiz.correctIndex) {
        b.classList.add('correct');
      } else if (idx === chosenIndex && !isCorrect) {
        b.classList.add('wrong');
      }
    });

    if (feedbackBox) {
      feedbackBox.className = `quiz-feedback-box ${isCorrect ? 'correct' : 'wrong'}`;
      feedbackBox.style.display = 'block';

      const lessonNum = quiz.lessonId.replace('lesson_', '');
      feedbackBox.innerHTML = `
        <div style="font-weight: 800; font-size: 15px; margin-bottom: 6px;">
          ${isCorrect ? '🎉 정답입니다! (+10 XP 획득)' : '❌ 아쉽습니다. 오답입니다. (오답 노트에 등록됨)'}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>해설:</strong> ${quiz.explanation}
        </div>
        ${!isCorrect ? `
          <div style="font-size: 13.5px; margin-bottom: 8px; opacity: 0.9;">
            💡 <strong>오답 분석:</strong> ${quiz.wrongExplanations[chosenIndex] || '선택하신 보기는 주의가 필요한 항목입니다.'}
          </div>
        ` : ''}
        <div style="margin-top: 10px; font-size: 13px;">
          <a href="#course/${quiz.lessonId}" style="color: inherit; text-decoration: underline; font-weight: 700;">
            📖 관련 학습 [${lessonNum}차시] 본문 복습하러 가기 →
          </a>
        </div>
      `;
    }

    if (isCorrect) {
      this.showToast('정답입니다! +10 XP', 'success');
    }
  }

  // ================= 4. 바이브코딩 입문 렌더링 =================
  renderVibe() {
    // 도구 카드 렌더링
    const toolsContainer = document.getElementById('tools-container');
    if (toolsContainer) {
      toolsContainer.innerHTML = TOOLS_DATA.map(tool => `
        <div class="tool-card">
          <div class="tool-badge-row">
            <span style="font-size: 24px;">${tool.icon}</span>
            <span class="tool-type-badge ${tool.badgeType}">${tool.badge}</span>
          </div>
          <h4 class="tool-name">${tool.name}</h4>
          <p class="tool-tagline">${tool.tagline}</p>
          <div class="tool-details">
            <div style="font-weight: 700; margin-bottom: 4px; color: var(--primary-slate);">
              📍 사용 단계: ${tool.stage}
            </div>
            <div style="color: var(--text-muted);">
              👉 초보자 첫 작업: ${tool.firstAction}
            </div>
          </div>
          <div style="margin-top: auto;">
            <a href="${tool.url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="width: 100%;">
              <span>공식 사이트 열기 ↗</span>
            </a>
          </div>
        </div>
      `).join('');
    }

    // 공식 레퍼런스 4선 렌더링
    const refContainer = document.getElementById('references-container');
    if (refContainer) {
      refContainer.innerHTML = OFFICIAL_REFERENCES.map(ref => `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span class="badge-tag level">${ref.provider}</span>
              <span class="badge-tag" style="background:#f1f5f9; color:#475569;">${ref.tag}</span>
            </div>
            <h4 style="font-size: 16px; font-weight: 800; color: var(--primary-slate); margin-bottom: 8px;">
              ${ref.title}
            </h4>
            <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px;">
              ${ref.desc}
            </p>
          </div>
          <div>
            <a href="${ref.url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="width: 100%;">
              <span>학습 사이트 바로가기 ↗</span>
            </a>
          </div>
        </div>
      `).join('');
    }

    // 10대 용어사전 렌더링
    const glossaryContainer = document.getElementById('glossary-container');
    if (glossaryContainer) {
      glossaryContainer.innerHTML = GLOSSARY_DATA.map(item => `
        <div class="glossary-card">
          <div class="glossary-term">📖 ${item.term}</div>
          <div class="glossary-meaning">${item.meaning}</div>
          <div class="glossary-analogy">
            🏛️ <strong>행정 비유:</strong> ${item.adminAnalogy}
          </div>
        </div>
      `).join('');
    }
  }

  // ================= 5. 프롬프트 실습실 렌더링 =================
  renderPrompt() {
    const container = document.getElementById('prompt-content-container');
    if (!container) return;

    if (this.currentPromptSubtab === 'builder') {
      this.renderPromptBuilder(container);
    } else if (this.currentPromptSubtab === 'templates') {
      this.renderBaseTemplates(container);
    } else if (this.currentPromptSubtab === 'handson') {
      this.renderHandsonPacks(container);
    } else if (this.currentPromptSubtab === 'debug') {
      this.renderDebugPrompts(container);
    } else if (this.currentPromptSubtab === 'saved') {
      this.renderSavedPrompts(container);
    }
  }

  // [A] 10단계 프롬프트 빌더 렌더링
  renderPromptBuilder(container) {
    let fieldsHTML = '';
    PROMPT_BUILDER_STEPS.forEach(step => {
      const val = this.builderFormData[step.key] || '';

      if (step.type === 'select') {
        fieldsHTML += `
          <div class="form-group">
            <label class="form-label">${step.label}</label>
            <select class="form-control builder-input" data-key="${step.key}">
              ${step.options.map(opt => `
                <option value="${opt.value}" ${val === opt.value ? 'selected' : ''}>${opt.text}</option>
              `).join('')}
            </select>
            <div class="form-help">${step.help}</div>
          </div>
        `;
      } else {
        fieldsHTML += `
          <div class="form-group">
            <label class="form-label">
              ${step.label} ${step.required ? '<span style="color:var(--accent-rose);">*</span>' : ''}
            </label>
            <textarea class="form-control builder-input" data-key="${step.key}" rows="2" placeholder="${step.placeholder}">${val}</textarea>
            <div class="form-help">${step.help}</div>
          </div>
        `;
      }
    });

    const generatedPrompt = buildStructuredPrompt(this.builderFormData);

    container.innerHTML = `
      <div class="prompt-builder-layout">
        <!-- 좌측 10단계 입력 폼 -->
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 class="card-title" style="margin:0;"><span>📝</span> 10단계 명세서 입력</h3>
            <button class="btn btn-secondary btn-sm" id="btn-builder-reset">
              <span>기본 예시 채우기</span>
            </button>
          </div>
          <form id="builder-form">
            ${fieldsHTML}
          </form>
        </div>

        <!-- 우측 실시간 완성본 & 액션 바 -->
        <div style="position: sticky; top: 20px;">
          <div class="card" style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 class="card-title" style="margin:0;"><span>🪄</span> 완성된 제작 프롬프트</h3>
              <span class="badge-tag level">실시간 조합됨</span>
            </div>
            <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 14px;">
              아래 생성된 프롬프트를 복사하여 Google AI Studio에 붙여넣기만 하면 웹앱이 제작됩니다.
            </p>

            <textarea class="preview-editor-box" id="builder-prompt-preview" rows="15" style="width: 100%; border:none; resize:vertical;">${generatedPrompt}</textarea>

            <!-- 규칙 기반 작성 항목 점검표 -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 14px 0;">
              <div style="font-size: 13px; font-weight: 800; color: var(--primary-slate); margin-bottom: 6px;">
                🔍 작성 항목 점검표 (품질 체크)
              </div>
              <div id="builder-checklist-items" style="font-size: 12.5px; line-height: 1.6;">
                <!-- 점검 결과 -->
              </div>
            </div>

            <!-- 액션 버튼군 -->
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary" id="btn-copy-builder-prompt" style="flex: 2;">
                  <span>📋 프롬프트 복사하기</span>
                </button>
                <button class="btn btn-secondary" id="btn-download-builder-txt" style="flex: 1;">
                  <span>💾 TXT 다운로드</span>
                </button>
              </div>

              <div style="display: flex; gap: 8px;">
                <button class="btn btn-navy" id="btn-save-builder-prompt" style="flex: 1;">
                  <span>⭐ 나의 프롬프트로 저장</span>
                </button>
                <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="flex: 1;">
                  <span>Google AI Studio 열기 ↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // 폼 입력 시 실시간 업데이트
    container.querySelectorAll('.builder-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const key = e.target.getAttribute('data-key');
        this.builderFormData[key] = e.target.value;
        const newPrompt = buildStructuredPrompt(this.builderFormData);
        const preview = document.getElementById('builder-prompt-preview');
        if (preview) preview.value = newPrompt;
        this.evaluateBuilderChecklist();
      });
    });

    this.evaluateBuilderChecklist();

    // 복사 버튼
    document.getElementById('btn-copy-builder-prompt').addEventListener('click', () => {
      const text = document.getElementById('builder-prompt-preview').value;
      this.copyToClipboard(text, '완성된 웹앱 제작 프롬프트가 복사되었습니다!');
    });

    // TXT 다운로드 버튼
    document.getElementById('btn-download-builder-txt').addEventListener('click', () => {
      const text = document.getElementById('builder-prompt-preview').value;
      const element = document.createElement('a');
      const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      element.download = `${this.builderFormData.appName || '행정웹도구'}_제작프롬프트.txt`;
      document.body.appendChild(element);
      element.click();
      element.remove();
      this.showToast('프롬프트 텍스트 파일이 다운로드되었습니다.', 'success');
    });

    // 저장 버튼
    document.getElementById('btn-save-builder-prompt').addEventListener('click', () => {
      const text = document.getElementById('builder-prompt-preview').value;
      storageManager.saveCustomPrompt(this.builderFormData.appName, text);
      this.showToast('나의 프롬프트 보관함에 저장되었습니다! (+배지 조건 달성)', 'success');
    });

    // 기본값 초기화
    document.getElementById('btn-builder-reset').addEventListener('click', (e) => {
      e.preventDefault();
      this.renderPromptBuilder(container);
    });
  }

  // 작성 항목 점검표 규칙 평가
  evaluateBuilderChecklist() {
    const box = document.getElementById('builder-checklist-items');
    if (!box) return;

    const data = this.builderFormData;
    const checks = [
      { name: '도구 목적 및 사용자 정의', pass: (data.appName && data.appName.length > 2 && data.purpose && data.targetUser) },
      { name: '화면 구성 구체성', pass: (data.screens && data.screens.length > 5) },
      { name: '핵심 기능 3가지 이상 명시', pass: (data.features && data.features.length > 10) },
      { name: '데이터 저장 방식 설정', pass: !!data.storageType },
      { name: '완성 후 자가 점검 조건 포함', pass: (data.doneChecklist && data.doneChecklist.length > 5) }
    ];

    box.innerHTML = checks.map(c => `
      <div style="display:flex; align-items:center; gap:6px; color: ${c.pass ? '#15803d' : '#b91c1c'};">
        <span>${c.pass ? '✓' : '⚠️'}</span>
        <span>${c.name}: ${c.pass ? '입력 완료' : '보완 필요 (누락 시 AI 품질 저하)'}</span>
      </div>
    `).join('');
  }

  // [B] 6대 기본 템플릿 렌더링
  renderBaseTemplates(container) {
    container.innerHTML = `
      <div class="template-grid">
        ${BASE_TEMPLATES.map(tpl => `
          <div class="card" style="display:flex; flex-direction:column;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <span style="font-size:24px;">${tpl.icon}</span>
              <span class="badge-tag level">${tpl.tag}</span>
            </div>
            <h4 style="font-size: 18px; font-weight:800; color:var(--primary-slate); margin-bottom:8px;">
              ${tpl.title}
            </h4>
            <p style="font-size: 13.5px; color:var(--text-muted); line-height:1.5; margin-bottom:14px;">
              📍 <strong>언제 쓰는가:</strong> ${tpl.whenToUse}
            </p>

            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:14px; font-size:13px;">
              <strong>✏️ 사용자가 바꿀 부분:</strong>
              <ul style="padding-left:18px; margin-top:4px;">
                ${tpl.customizableParts.map(p => `<li>${p}</li>`).join('')}
              </ul>
            </div>

            <div style="margin-top:auto; display:flex; gap:8px;">
              <button class="btn btn-primary btn-sm btn-copy-tpl" data-id="${tpl.id}" style="flex:1;">
                <span>📋 기본 프롬프트 복사</span>
              </button>
              <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
                <span>AI Studio 열기 ↗</span>
              </a>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.btn-copy-tpl').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const tpl = BASE_TEMPLATES.find(t => t.id === id);
        if (tpl) {
          this.copyToClipboard(tpl.basePrompt, `[${tpl.title}] 프롬프트가 복사되었습니다!`);
        }
      });
    });
  }

  // [C] 커리큘럼 핸즈온 5선 프롬프트 팩 렌더링
  renderHandsonPacks(container) {
    container.innerHTML = `
      <div style="margin-bottom: 20px; background:#f0fdfa; border:1px solid #99f6e4; padding:16px 20px; border-radius:10px;">
        <h4 style="font-size:15px; font-weight:800; color:#0f766e; margin-bottom:4px;">
          🎯 공공행정 특화 핸즈온 프로젝트 5선 프롬프트 팩
        </h4>
        <p style="font-size:13.5px; color:#115e59;">
          연구동아리 회원들이 각자 1개씩 직접 제작해 볼 수 있는 실무 밀착형 웹도구 과제 프롬프트입니다.
        </p>
      </div>

      <div style="display:flex; flex-direction:column; gap:20px;">
        ${HANDSON_PROJECTS.map(proj => `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <span class="badge-tag level">${proj.category}</span>
              <button class="btn btn-primary btn-sm btn-copy-handson" data-id="${proj.id}">
                <span>📋 완성 프롬프트 복사</span>
              </button>
            </div>
            <h4 style="font-size:18px; font-weight:800; color:var(--primary-slate); margin-bottom:6px;">
              ${proj.title}
            </h4>
            <p style="font-size:14px; color:var(--text-muted); margin-bottom:12px;">
              ${proj.desc}
            </p>

            <div style="background:#0f172a; color:#e2e8f0; padding:16px; border-radius:8px; font-family:monospace; font-size:13px; max-height:200px; overflow-y:auto; white-space:pre-wrap; margin-bottom:12px;">
              ${proj.prompt}
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${proj.points.map(pt => `<span class="badge-tag" style="background:#e0f2fe; color:#0369a1;">✓ ${pt}</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.btn-copy-handson').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const proj = HANDSON_PROJECTS.find(p => p.id === id);
        if (proj) {
          this.copyToClipboard(proj.prompt, `[${proj.title}] 프롬프트가 복사되었습니다!`);
        }
      });
    });
  }

  // [D] 5대 상황별 수정 프롬프트 렌더링
  renderDebugPrompts(container) {
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        ${DEBUG_PROMPTS.map(d => `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <h4 style="font-size:16px; font-weight:800; color:var(--primary-slate);">
                🚨 ${d.title}
              </h4>
              <button class="btn btn-secondary btn-sm btn-copy-debug" data-id="${d.id}">
                <span>📋 수정 프롬프트 복사</span>
              </button>
            </div>
            <p style="font-size:13.5px; color:var(--text-muted); margin-bottom:10px;">
              📍 <strong>발생 상황:</strong> ${d.situation}
            </p>
            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px; font-size:13px; font-family:monospace; white-space:pre-wrap;">
              ${d.promptText}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.btn-copy-debug').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const d = DEBUG_PROMPTS.find(p => p.id === id);
        if (d) {
          this.copyToClipboard(d.promptText, `[${d.title}] 수정 프롬프트가 복사되었습니다!`);
        }
      });
    });
  }

  // [E] 내가 저장한 프롬프트 렌더링
  renderSavedPrompts(container) {
    const state = storageManager.getState();
    const saved = state.savedPrompts || [];

    if (saved.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align:center; padding:48px;">
          <div style="font-size:40px; margin-bottom:10px;">💾</div>
          <h4 style="font-size:18px; font-weight:800; color:var(--primary-slate); margin-bottom:6px;">
            아직 저장된 프롬프트가 없습니다.
          </h4>
          <p style="font-size:14px; color:var(--text-muted); margin-bottom:16px;">
            [10단계 프롬프트 빌더]에서 프롬프트를 만든 후 '나의 프롬프트로 저장' 버튼을 눌러보세요.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        ${saved.map(p => `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <h4 style="font-size:17px; font-weight:800; color:var(--primary-slate);">${p.title}</h4>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-primary btn-sm btn-copy-saved" data-id="${p.id}">복사</button>
                <button class="btn btn-secondary btn-sm btn-del-saved" data-id="${p.id}" style="color:var(--accent-rose);">삭제</button>
              </div>
            </div>
            <div style="font-size:12px; color:var(--text-subtle); margin-bottom:10px;">
              저장일시: ${new Date(p.createdAt).toLocaleString()}
            </div>
            <div style="background:#0f172a; color:#e2e8f0; padding:14px; border-radius:6px; font-family:monospace; font-size:13px; max-height:160px; overflow-y:auto; white-space:pre-wrap;">
              ${p.promptText}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.btn-copy-saved').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const p = saved.find(item => item.id === id);
        if (p) this.copyToClipboard(p.promptText, `[${p.title}] 프롬프트가 복사되었습니다!`);
      });
    });

    container.querySelectorAll('.btn-del-saved').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm('이 프롬프트를 삭제하시겠습니까?')) {
          storageManager.deleteCustomPrompt(id);
          this.renderSavedPrompts(container);
          this.showToast('프롬프트가 삭제되었습니다.', 'info');
        }
      });
    });
  }

  // ================= 6. 만들기 미션 렌더링 =================
  renderMission() {
    const container = document.getElementById('missions-container');
    if (!container) return;

    const state = storageManager.getState();
    const submissions = state.missionSubmissions || {};

    container.innerHTML = MISSIONS_DATA.map(m => {
      const sub = submissions[m.id];
      const isCompleted = !!sub;

      return `
        <div class="mission-card" id="mission-card-${m.id}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
            <div>
              <div style="display:flex; gap:8px; margin-bottom:6px;">
                <span class="badge-tag level">${m.difficulty}</span>
                <span class="badge-tag time">⏱️ 약 ${m.timeEstimate}</span>
                <span class="badge-tag" style="background:${m.isRequired ? '#fee2e2; color:#991b1b;' : '#f1f5f9; color:#475569;'}">
                  ${m.isRequired ? '필수 미션' : '자율 선택'}
                </span>
                ${isCompleted ? '<span class="badge-tag status">✓ 미션 완료 (+50 XP)</span>' : ''}
              </div>
              <h3 style="font-size:22px; font-weight:800; color:var(--primary-slate);">${m.title}</h3>
              <p style="font-size:14.5px; color:var(--text-muted);">${m.tagline}</p>
            </div>
            <div style="font-size:20px; font-weight:800; color:var(--accent-amber);">
              +${m.xpAward} XP
            </div>
          </div>

          <!-- 제작 기능 및 단계 -->
          <div class="grid-2" style="margin-bottom:20px;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:8px;">
              <h5 style="font-size:14px; font-weight:800; color:var(--primary-slate); margin-bottom:8px;">
                🛠️ 구현할 핵심 기능
              </h5>
              <ul class="clean-list" style="font-size:13.5px;">
                ${m.features.map(f => `<li>${f}</li>`).join('')}
              </ul>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:8px;">
              <h5 style="font-size:14px; font-weight:800; color:var(--primary-slate); margin-bottom:8px;">
                🗺️ 단계별 제작 순서
              </h5>
              <ul class="clean-list" style="font-size:13.5px;">
                ${m.stepByStepGuide.map(s => `<li>${s}</li>`).join('')}
              </ul>
            </div>
          </div>

          <!-- 시작 프롬프트 복사 & AI Studio 링크 바 -->
          <div style="display:flex; gap:10px; margin-bottom:24px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-copy-mission-start" data-id="${m.id}">
              <span>📋 시작 프롬프트 복사하기</span>
            </button>
            <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
              <span>Google AI Studio 열기 ↗</span>
            </a>
            <button class="btn btn-secondary btn-toggle-more-prompts" data-id="${m.id}">
              <span>기능추가 / 오류수정 프롬프트 보기 ▼</span>
            </button>
          </div>

          <!-- 접혀있는 후속 프롬프트 -->
          <div id="more-prompts-${m.id}" style="display:none; background:#f1f5f9; padding:16px; border-radius:8px; margin-bottom:24px;">
            <div style="margin-bottom:12px;">
              <strong style="font-size:13px; color:var(--primary-slate);">✨ 기능 추가 프롬프트:</strong>
              <div style="background:white; padding:10px; border-radius:6px; font-size:12.5px; font-family:monospace; margin-top:4px;">
                ${m.additionPrompt}
              </div>
            </div>
            <div>
              <strong style="font-size:13px; color:var(--primary-slate);">🚨 오류 수정 프롬프트:</strong>
              <div style="background:white; padding:10px; border-radius:6px; font-size:12.5px; font-family:monospace; margin-top:4px;">
                ${m.debugPrompt}
              </div>
            </div>
          </div>

          <!-- 5단계 완료 자가점검 체크리스트 -->
          <div style="background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:20px; margin-bottom:20px;">
            <h4 style="font-size:15px; font-weight:800; color:var(--primary-slate); margin-bottom:10px;">
              ✅ 완성도 자가 점검 체크리스트 (직접 테스트 후 체크)
            </h4>
            <div class="mission-checklist-group" data-id="${m.id}">
              ${m.checklist.map((cText, cIdx) => {
                const checked = sub && sub.checklist && sub.checklist[cIdx];
                return `
                  <label class="checklist-item">
                    <input type="checkbox" data-cidx="${cIdx}" ${checked ? 'checked' : ''}>
                    <span>${cText}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 결과 등록 및 3단 회고 폼 -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:20px;">
            <h4 style="font-size:15px; font-weight:800; color:var(--primary-slate); margin-bottom:12px;">
              📝 실습 결과 및 성장을 위한 3단 회고
            </h4>

            <div class="form-group">
              <label class="form-label">결과 웹사이트 URL 또는 실행 확인 메모 (http/https 주소 권장)</label>
              <input type="text" class="form-control mission-url-input" data-id="${m.id}" placeholder="예: https://my-username.github.io/my-app/ 또는 AI Studio 로컬 구동 완료" value="${sub ? sub.resultUrl : ''}">
            </div>

            <div class="grid-3" style="margin-bottom:16px;">
              <div class="form-group">
                <label class="form-label" style="font-size:13px;">1. 배운 점 (Learned)</label>
                <textarea class="form-control mission-retro-learned" data-id="${m.id}" rows="3" placeholder="AI와 협업하며 새롭게 알게 된 점">${sub ? sub.retroLearned : ''}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:13px;">2. 어려웠던 점 (Difficulties)</label>
                <textarea class="form-control mission-retro-diff" data-id="${m.id}" rows="3" placeholder="실습 중 겪었던 시행착오">${sub ? sub.retroDifficult : ''}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:13px;">3. 다음 개선점 (Improvements)</label>
                <textarea class="form-control mission-retro-imp" data-id="${m.id}" rows="3" placeholder="내 업무에 적용해보고 싶은 다음 기능">${sub ? sub.retroImprove : ''}</textarea>
              </div>
            </div>

            <button class="btn btn-primary btn-submit-mission" data-id="${m.id}">
              <span>${isCompleted ? '✓ 회고 수정 저장하기' : '🌟 미션 완료 등록 및 50 XP 받기'}</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // 시작 프롬프트 복사 이벤트
    container.querySelectorAll('.btn-copy-mission-start').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const m = MISSIONS_DATA.find(item => item.id === id);
        if (m) this.copyToClipboard(m.startPrompt, `[${m.title}] 시작 프롬프트가 복사되었습니다!`);
      });
    });

    // 후속 프롬프트 토글
    container.querySelectorAll('.btn-toggle-more-prompts').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const box = document.getElementById(`more-prompts-${id}`);
        if (box) {
          box.style.display = box.style.display === 'none' ? 'block' : 'none';
        }
      });
    });

    // 미션 완료 제출 이벤트
    container.querySelectorAll('.btn-submit-mission').forEach(btn => {
      btn.addEventListener('click', () => {
        const mId = btn.getAttribute('data-id');
        const card = container.querySelector(`#mission-card-${mId}`);
        if (!card) return;

        // 체크리스트 확인
        const checkBoxes = card.querySelectorAll('.mission-checklist-group input[type="checkbox"]');
        const checklist = Array.from(checkBoxes).map(c => c.checked);
        const checkedCount = checklist.filter(Boolean).length;

        if (checkedCount < 3) {
          alert('미션을 완료하기 위해 자가점검 체크리스트를 최소 3개 이상 테스트하고 체크해 주세요.');
          return;
        }

        const urlInput = card.querySelector('.mission-url-input').value.trim();
        const learned = card.querySelector('.mission-retro-learned').value.trim();
        const diff = card.querySelector('.mission-retro-diff').value.trim();
        const imp = card.querySelector('.mission-retro-imp').value.trim();

        if (!learned || !diff || !imp) {
          alert('성장을 위해 3단 회고(배운점, 어려웠던점, 개선점)를 각각 1줄 이상 성실히 작성해 주세요.');
          return;
        }

        // 저장 호출
        storageManager.submitMission(mId, {
          checklist,
          resultUrl: urlInput,
          retroLearned: learned,
          retroDifficult: diff,
          retroImprove: imp
        });

        this.showToast(`🎉 [${mId}] 미션 완료 등록 성공! +50 XP를 획득했습니다.`, 'success');
        this.renderMission();
      });
    });
  }

  // ================= 7. 나의 학습 & 데이터 센터 렌더링 =================
  renderMyLearning() {
    const state = storageManager.getState();
    const levelInfo = storageManager.getCurrentLevel();

    // 상단 프로필
    const myTier = document.getElementById('my-tier-name');
    const myTierDesc = document.getElementById('my-tier-desc');
    const myTotalXP = document.getElementById('my-total-xp');

    if (myTier) myTier.textContent = `${levelInfo.currentLevel.icon} ${levelInfo.currentLevel.title}`;
    if (myTierDesc) myTierDesc.textContent = levelInfo.currentLevel.description;
    if (myTotalXP) myTotalXP.textContent = state.earnedXP;

    // 배지 6종 렌더링
    const badgesContainer = document.getElementById('my-badges-container');
    if (badgesContainer) {
      badgesContainer.innerHTML = BADGE_DEFINITIONS.map(b => {
        const isEarned = state.badges.includes(b.id);
        return `
          <div class="badge-item ${isEarned ? 'earned' : ''}" title="${b.condition}">
            <div class="badge-icon">${b.icon}</div>
            <div class="badge-name">${b.name}</div>
            <div style="font-size: 10.5px; color: ${isEarned ? '#0d9488' : '#94a3b8'}; margin-top: 4px;">
              ${isEarned ? '✓ 획득 완료' : '미달성'}
            </div>
          </div>
        `;
      }).join('');
    }

    // 16개 차시 현황 리스트
    const lessonListContainer = document.getElementById('my-lessons-status-list');
    if (lessonListContainer) {
      lessonListContainer.innerHTML = CURRICULUM_DATA.map(l => {
        const isDone = state.completedLessons.includes(l.id);
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:13.5px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span>${isDone ? '✅' : '⚪'}</span>
              <span><strong>${l.lessonNumber}차시</strong>: ${l.title}</span>
            </div>
            <div>
              ${isDone ? '<span style="color:#15803d; font-weight:700;">완료 (+20 XP)</span>' : '<a href="#course/' + l.id + '" style="color:var(--primary-teal); font-weight:600;">학습하기 →</a>'}
            </div>
          </div>
        `;
      }).join('');
    }

    // 퀴즈 통계
    const attempts = Object.values(state.quizHistory || {});
    let firstCorrect = 0;
    attempts.forEach(a => {
      if (a.firstCorrect) firstCorrect++;
    });
    const firstRate = attempts.length > 0 ? Math.round((firstCorrect / attempts.length) * 100) : 0;

    const rateElem = document.getElementById('my-quiz-first-rate');
    if (rateElem) rateElem.textContent = `${firstRate}% (${firstCorrect} / ${attempts.length} 문항)`;

    const wrongElem = document.getElementById('my-quiz-wrong-count');
    if (wrongElem) wrongElem.textContent = `${state.wrongQuestions.length}개`;

    const revElem = document.getElementById('my-quiz-reviewed-count');
    if (revElem) revElem.textContent = `${state.reviewedQuestions.length}개`;
  }
}

// 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});



  // 브라우저 window 객체에 핵심 모듈 및 데이터 등록
  if (typeof window !== 'undefined') {
    window.storageManager = storageManager;
    window.LEVEL_TIERS = LEVEL_TIERS;
    window.BADGE_DEFINITIONS = BADGE_DEFINITIONS;
    window.CURRICULUM_DATA = CURRICULUM_DATA;
    window.QUIZ_DATA = QUIZ_DATA;
    window.BASE_TEMPLATES = BASE_TEMPLATES;
    window.HANDSON_PROJECTS = HANDSON_PROJECTS;
    window.DEBUG_PROMPTS = DEBUG_PROMPTS;
    window.PROMPT_BUILDER_STEPS = PROMPT_BUILDER_STEPS;
    window.buildStructuredPrompt = buildStructuredPrompt;
    window.TOOLS_DATA = TOOLS_DATA;
    window.OFFICIAL_REFERENCES = OFFICIAL_REFERENCES;
    window.GLOSSARY_DATA = GLOSSARY_DATA;
    window.MISSIONS_DATA = MISSIONS_DATA;
  }

})();
