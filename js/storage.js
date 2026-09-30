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
export const LEVEL_TIERS = [
  { minXP: 0, maxXP: 99, title: 'AI 새싹', icon: '🌱', description: '생성형 AI와 공공행정 혁신의 첫걸음을 내딛은 학습자' },
  { minXP: 100, maxXP: 299, title: 'AI 탐험가', icon: '🧭', description: '기본 프롬프트 원리를 익히고 실무 적용을 탐색하는 단계' },
  { minXP: 300, maxXP: 599, title: '업무 활용가', icon: '💼', description: '행정 문서 작성 및 보안 지침을 지키며 AI를 활용하는 숙련자' },
  { minXP: 600, maxXP: 999, title: '바이브 메이커', icon: '🛠️', description: '자연어로 필요한 행정 웹도구를 직접 기획하고 구현하는 제작자' },
  { minXP: 1000, maxXP: Infinity, title: '행정혁신 실천가', icon: '🏆', description: '조직의 일하는 방식을 스마트하게 혁신하는 최고 단계' }
];

// 배지 정의 (메타프롬프트 규격 6종)
export const BADGE_DEFINITIONS = [
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
export const storageManager = new StorageManager();
