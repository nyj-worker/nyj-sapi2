/**
 * 스마트 행정혁신 AI 러닝랩 - 메인 애플리케이션 컨트롤러
 * 
 * [초보자 설명]
 * 이 스크립트는 웹사이트의 모든 화면 전환(7대 메뉴), 퀴즈 채점,
 * 프롬프트 조합 마법사, 미션 자가 점검 및 회고 저장, 데이터 백업/복원을
 * 총괄하는 핵심 지휘부입니다.
 */

import { storageManager, LEVEL_TIERS, BADGE_DEFINITIONS } from './storage.js';
import { CURRICULUM_DATA } from './data/curriculumData.js';
import { QUIZ_DATA } from './data/quizData.js';
import {
  BASE_TEMPLATES,
  HANDSON_PROJECTS,
  DEBUG_PROMPTS,
  PROMPT_BUILDER_STEPS,
  buildStructuredPrompt
} from './data/promptTemplates.js';
import { TOOLS_DATA, OFFICIAL_REFERENCES, GLOSSARY_DATA } from './data/toolsData.js';
import { MISSIONS_DATA } from './data/missionData.js';

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
