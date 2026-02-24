
import React, { useState, useEffect, useRef } from 'react';
import { 
  UserProfile, KnowledgeLevel, LearningGoal, LearningStyle, 
  LearningPath, Module, Quiz, SessionFeedback, Message 
} from './types';
import { generateLearningPath, getTutorResponse, generateQuiz, getRelatedCourseSuggestions } from './services/geminiService';
import { Button } from './components/Button';
import { courseData, Subject, Playlist } from './courseData';

enum View {
  WELCOME = 'welcome',
  ONBOARDING = 'onboarding',
  DASHBOARD = 'dashboard',
  TUTORING = 'tutoring',
  QUIZ = 'quiz',
  FEEDBACK = 'feedback',
  COURSES = 'courses',
  PLAYLISTS = 'playlists',
  LEARN = 'learn'
}

type Theme = 'light' | 'dark';

const getYoutubeEmbedId = (url?: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.WELCOME);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [currentModule, setCurrentModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Initializing...");
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const sessionStartTime = useRef<number>(0);

  useEffect(() => {
    const savedTheme = localStorage.getItem('edupal_theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('edupal_theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  useEffect(() => {
    const savedProfile = localStorage.getItem('edupal_profile');
    const savedPath = localStorage.getItem('edupal_path');
    if (savedProfile && savedPath) {
      const p = JSON.parse(savedProfile);
      const path = JSON.parse(savedPath);
      setProfile(p);
      setLearningPath(path);
      setCurrentModule(path.modules[0]);
      setView(View.DASHBOARD);
      loadSuggestions(p);
    }
  }, []);

  const findSubjectByKeyword = (keyword: string): Subject | null => {
    const lower = keyword.toLowerCase();
    return courseData.find(s => 
      s.name.toLowerCase().includes(lower) ||
      s.id.toLowerCase().includes(lower)
    ) || null;
  };

  const loadSuggestions = async (p: UserProfile) => {
    const titles = await getRelatedCourseSuggestions(p);
    setSuggestedTitles(titles);
  };

  const saveState = (newProfile: UserProfile, newPath: LearningPath) => {
    localStorage.setItem('edupal_profile', JSON.stringify(newProfile));
    localStorage.setItem('edupal_path', JSON.stringify(newPath));
  };

  const handleOnboardingComplete = async (userData: UserProfile) => {
    const keyword = userData.topic?.toLowerCase() || '';
    const matchedSubject = findSubjectByKeyword(keyword);
    
    if (matchedSubject) {
      setSelectedSubject(matchedSubject);
      setProfile(userData);
      setView(View.LEARN);
      return;
    }

    setIsLoading(true);
    setLoadingMsg("Synthesizing Personalized Curriculum...");
    setProfile(userData);
    try {
      const path = await generateLearningPath(userData);
      setLearningPath(path);
      setCurrentModule(path.modules[0]);
      saveState(userData, path);
      await loadSuggestions(userData);
      setView(View.DASHBOARD);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggested = async (newTopic: string) => {
    if (!profile) return;
    setIsLoading(true);
    setLoadingMsg(`Architecting "${newTopic}"...`);
    const newProfile = { ...profile, topic: newTopic };
    setProfile(newProfile);
    try {
      const path = await generateLearningPath(newProfile);
      setLearningPath(path);
      setCurrentModule(path.modules[0]);
      saveState(newProfile, path);
      loadSuggestions(newProfile);
      setView(View.DASHBOARD);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = () => {
    const elapsed = Math.round((Date.now() - sessionStartTime.current) / 60000);
    if (profile) {
      const updatedProfile = {
        ...profile,
        performance: {
          ...profile.performance,
          timeSpentMinutes: (profile.performance.timeSpentMinutes || 0) + elapsed
        }
      };
      setProfile(updatedProfile);
    }
    setView(View.FEEDBACK);
  };

  const submitFeedback = (feedback: SessionFeedback) => {
    if (profile && learningPath) {
      const updatedProfile = {
        ...profile,
        performance: { ...profile.performance, lastFeedback: feedback }
      };
      setProfile(updatedProfile);
      saveState(updatedProfile, learningPath);
    }
    setView(View.DASHBOARD);
  };

  const startQuiz = async () => {
    if (!profile || !currentModule) return;
    setIsLoading(true);
    setLoadingMsg("Generating Assessment...");
    try {
      const quiz = await generateQuiz(profile, currentModule.title);
      setActiveQuiz(quiz);
      setView(View.QUIZ);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizComplete = (score: number, total: number) => {
    if (!learningPath || !currentModule || !profile) return;
    const passed = (score / total) >= 0.8;
    
    let newPath = { ...learningPath };
    if (passed) {
      const updatedModules = learningPath.modules.map((m) => {
        if (m.id === currentModule.id) return { ...m, status: 'completed' as const };
        return m;
      });
      newPath = { ...learningPath, modules: updatedModules };
      setLearningPath(newPath);
    }

    const currentScores = [...(profile.performance.quizScores || []), score];
    const avgAccuracy = Math.round((currentScores.reduce((a, b) => a + b, 0) / (currentScores.length * 5)) * 100);

    const newProfile: UserProfile = {
      ...profile,
      performance: {
        ...profile.performance,
        quizScores: currentScores,
        averageAccuracy: avgAccuracy,
        completedTopics: passed ? [...profile.performance.completedTopics, currentModule.title] : profile.performance.completedTopics
      }
    };
    setProfile(newProfile);
    saveState(newProfile, newPath);
  };

  const handleSelectModule = (module: Module) => {
    setCurrentModule(module);
    sessionStartTime.current = Date.now();
    setView(View.TUTORING);
  };

  return (
    <div className="min-h-screen flex flex-col items-center w-full max-w-[100vw] overflow-x-hidden text-foreground selection:bg-primary/10 font-sans bg-background">
      <header className="w-full max-w-6xl px-6 py-4 flex justify-between items-center z-50 sticky top-0 glass-header">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => profile ? setView(View.DASHBOARD) : setView(View.WELCOME)}>
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-all">
            <span className="text-xl font-black tracking-tighter">EP</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none text-foreground">EduPal</h1>
            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Learn Smarter</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all bg-card"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          {profile && view !== View.WELCOME && view !== View.ONBOARDING && (
            <button 
              onClick={() => { setSelectedSubject(null); setView(View.COURSES); }}
              className="text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all bg-card"
            >
              Courses
            </button>
          )}
          {profile && view !== View.WELCOME && view !== View.ONBOARDING && view !== View.LEARN && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{profile.subject}</span>
                <span className="text-xs font-bold text-foreground capitalize">{profile.level}</span>
              </div>
              <div className="w-9 h-9 rounded-full border border-border overflow-hidden p-0.5 bg-muted">
                 <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${profile.name}&backgroundColor=6366f1`} alt="avatar" className="rounded-full w-full h-full" />
              </div>
              <Button variant="ghost" size="icon" onClick={() => { localStorage.clear(); window.location.reload(); }} className="h-9 w-9 text-muted-foreground hover:text-foreground">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="w-full max-w-4xl flex-1 px-6 pb-24 mt-6">
        {isLoading && (
          <div className="fixed inset-0 bg-background/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center gap-6 text-center p-6">
             <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-primary/10 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
             </div>
             <p className="text-lg font-bold tracking-tight text-foreground animate-pulse">{loadingMsg}</p>
          </div>
        )}

        {view === View.WELCOME && <WelcomeView onStart={() => setView(View.ONBOARDING)} onCourses={() => setView(View.COURSES)} />}
        {view === View.ONBOARDING && <OnboardingView onComplete={handleOnboardingComplete} onBack={() => setView(View.WELCOME)} />}
        {view === View.COURSES && (
          <CourseCatalogView 
            onSelectSubject={(subject) => { setSelectedSubject(subject); setView(View.LEARN); }}
            onBack={() => setView(View.WELCOME)}
          />
        )}
        {view === View.LEARN && selectedSubject && (
          <LearnView 
            subject={selectedSubject}
            onSelectPlaylist={(playlist) => { setSelectedPlaylist(playlist); setView(View.TUTORING); }}
            onBack={() => setView(View.COURSES)}
          />
        )}
        {view === View.TUTORING && selectedPlaylist && (
          <PlaylistTutorView 
            playlist={selectedPlaylist}
            subject={selectedSubject}
            onBack={() => selectedPlaylist ? setView(View.LEARN) : setView(View.COURSES)}
          />
        )}
        {view === View.DASHBOARD && profile && learningPath && (
          <DashboardView 
            profile={profile} 
            path={learningPath} 
            currentModule={currentModule}
            suggested={suggestedTitles}
            onSelectModule={handleSelectModule}
            onSelectSuggested={handleSelectSuggested}
            onStartQuiz={startQuiz}
          />
        )}
        {view === View.TUTORING && profile && currentModule && (
          <TutorSessionView profile={profile} currentModule={currentModule} onBack={handleEndSession} />
        )}
        {view === View.QUIZ && activeQuiz && (
          <QuizView quiz={activeQuiz} onComplete={handleQuizComplete} onBack={() => setView(View.DASHBOARD)} />
        )}
        {view === View.FEEDBACK && <FeedbackView onSelect={submitFeedback} />}
      </main>
    </div>
  );
};

// --- Sub-Components ---

const WelcomeView: React.FC<{ onStart: () => void; onCourses: () => void }> = ({ onStart, onCourses }) => (
  <div className="flex flex-col items-center justify-center text-center mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
    <div className="relative mb-8">
      <div className="w-28 h-28 bg-black rounded-[3rem] flex items-center justify-center shadow-2xl">
        <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      </div>
      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center shadow-lg">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    </div>
    <h1 className="text-5xl sm:text-7xl font-black text-foreground tracking-tighter mb-6">
      <span className="text-foreground">Learn</span> Smarter
    </h1>
    <p className="text-lg text-muted-foreground max-w-xl mb-12 font-medium leading-relaxed px-4">
      Master any subject with AI-powered personalized learning paths and curated video playlists.
    </p>
    <div className="flex flex-col sm:flex-row gap-4">
      <Button size="lg" onClick={onCourses} className="px-10 h-14 rounded-2xl text-base font-bold hover:scale-105 transition-all shadow-lg bg-secondary text-secondary-foreground hover:bg-secondary/80">
        Browse Courses
      </Button>
      <Button size="lg" onClick={onStart} className="px-10 h-14 rounded-2xl text-base font-bold hover:scale-105 transition-all shadow-lg bg-zinc-900 hover:bg-zinc-800 text-white">Start Learning</Button>
    </div>
    <div className="mt-16 flex gap-8 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
       <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-zinc-600" /> Expert Curated</span>
       <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-zinc-500" /> AI Powered</span>
       <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-zinc-400" /> Self Paced</span>
    </div>
  </div>
);

const OnboardingView: React.FC<{ onComplete: (p: UserProfile) => void; onBack: () => void }> = ({ onComplete, onBack }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<UserProfile>>({
    level: KnowledgeLevel.BEGINNER,
    goal: LearningGoal.CONCEPT_UNDERSTANDING,
    style: LearningStyle.MIXED,
    timePerDay: 1,
    language: 'English',
    performance: { quizScores: [], timeSpentMinutes: 0, completedTopics: [], averageAccuracy: 0 }
  });

  const next = () => setStep(s => s + 1);
  const prev = () => step === 1 ? onBack() : setStep(s => s - 1);

  return (
    <div className="premium-card p-8 sm:p-16 mt-8 animate-in zoom-in-95 duration-500 bg-card backdrop-blur-md">
      <div className="mb-16 flex gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-primary shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'bg-muted'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-10 animate-in slide-in-from-right-4">
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">What should we call you?</h2>
            <p className="text-muted-foreground font-medium">Let's personalize your learning experience.</p>
          </div>
          <div className="grid gap-8">
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground ml-1">Your Name</label>
              <input className="w-full text-lg font-medium bg-background p-5 rounded-2xl border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground/50" placeholder="Enter your name" onChange={e => setData({...data, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground ml-1">Your Grade</label>
                <input className="w-full text-lg font-medium bg-background p-5 rounded-2xl border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground/50" placeholder="e.g. Grade 11" onChange={e => setData({...data, classInfo: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground ml-1">Subject</label>
                <input className="w-full text-lg font-medium bg-background p-5 rounded-2xl border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground/50" placeholder="e.g. Maths" onChange={e => setData({...data, subject: e.target.value})} />
              </div>
            </div>
          </div>
          <Button className="w-full h-14 rounded-2xl text-base font-semibold" onClick={next} disabled={!data.name || !data.classInfo || !data.subject}>Continue</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-10 animate-in slide-in-from-right-4">
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">What do you want to learn?</h2>
            <p className="text-muted-foreground font-medium">Tell us your learning goal.</p>
          </div>
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground ml-1">Current Level</label>
              <div className="grid grid-cols-3 gap-4">
                {Object.values(KnowledgeLevel).map(lvl => (
                  <button key={lvl} className={`p-4 rounded-2xl border-2 font-medium capitalize transition-all text-sm ${data.level === lvl ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:border-primary/50 text-muted-foreground'}`} onClick={() => setData({...data, level: lvl})}>{lvl}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground ml-1">Topic</label>
              <input className="w-full text-lg font-medium bg-background p-5 rounded-2xl border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground/50" placeholder="e.g. Calculus, Physics, Chemistry" onChange={e => setData({...data, topic: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1 h-14 rounded-2xl font-semibold" onClick={prev}>Back</Button>
            <Button className="flex-[2] h-14 rounded-2xl font-semibold" onClick={next} disabled={!data.topic}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-10 animate-in slide-in-from-right-4">
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Almost there!</h2>
            <p className="text-muted-foreground font-medium">Just a few more settings.</p>
          </div>
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground ml-1">Language</label>
                <input className="w-full p-5 rounded-2xl bg-background text-foreground border border-border outline-none font-medium text-lg" value={data.language} onChange={e => setData({...data, language: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground ml-1">Goal</label>
                <select className="w-full p-5 rounded-2xl bg-background text-foreground border border-border outline-none font-medium text-lg" value={data.goal} onChange={e => setData({...data, goal: e.target.value as LearningGoal})}>
                  {Object.values(LearningGoal).map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={prev} className="flex-1 h-14 rounded-2xl">Back</Button>
            <Button className="flex-[2] h-14 rounded-2xl font-semibold" onClick={() => onComplete(data as UserProfile)}>Start Learning</Button>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardView: React.FC<{ 
  profile: UserProfile, 
  path: LearningPath, 
  currentModule: Module | null,
  suggested: string[],
  onSelectModule: (m: Module) => void,
  onSelectSuggested: (t: string) => void,
  onStartQuiz: () => void
}> = ({ profile, path, currentModule, suggested, onSelectModule, onSelectSuggested, onStartQuiz }) => {
  const progress = Math.round((path.modules.filter(m => m.status === 'completed').length / path.modules.length) * 100);

  return (
    <div className="space-y-20 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 premium-card p-12 bg-black flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <svg className="w-48 h-48 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99z"/></svg>
          </div>
          <div className="relative w-32 h-32 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
              <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="4" fill="transparent" 
                strokeDasharray={377} strokeDashoffset={377 - (377 * progress) / 100}
                strokeLinecap="round" className="text-white transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white">{progress}%</span>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left z-10">
            <h2 className="text-4xl font-black tracking-tight text-white mb-3">{profile.topic}</h2>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] mb-8">{profile.level} Mastery Path</p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <Button onClick={() => currentModule && onSelectModule(currentModule)} className="h-12 px-8 rounded-full font-bold">Resume Node</Button>
              <Button variant="secondary" onClick={onStartQuiz} disabled={!currentModule} className="h-12 px-8 rounded-full font-bold">Evaluative Mode</Button>
            </div>
          </div>
        </div>
        
        <div className="premium-card p-10 bg-black/40 flex flex-col justify-between border-zinc-900">
          <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.4em] mb-6">System Health</h3>
          <div className="space-y-6">
            <div className="flex justify-between items-end border-b border-white/5 pb-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Accuracy</span>
              <span className="text-2xl font-black text-white">{profile.performance.averageAccuracy}%</span>
            </div>
            <div className="flex justify-between items-end border-b border-white/5 pb-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Time Spent</span>
              <span className="text-2xl font-black text-white">{profile.performance.timeSpentMinutes}m</span>
            </div>
            <div className="flex justify-between items-end">
               <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Matrix Status</span>
               <span className="text-[9px] font-black uppercase text-zinc-400 bg-zinc-400/10 px-3 py-1 rounded-full border border-zinc-400/20">Optimal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-4 px-1">
          Active Curriculum Nodes
          <span className="text-[9px] bg-white/5 border border-white/10 px-3 py-1 rounded-full text-zinc-500 uppercase tracking-[0.2em] font-black">Open Access</span>
        </h3>
        <div className="grid gap-5">
          {path.modules.map((m, i) => (
            <div 
              key={m.id} 
              className={`premium-card p-8 flex items-start gap-8 relative overflow-hidden transition-all group cursor-pointer border-white/5 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.04]`}
              onClick={() => onSelectModule(m)}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all duration-500 ${m.status === 'completed' ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-transparent border-white/10 text-white group-hover:border-white/30'}`}>
                {m.status === 'completed' ? <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <span className="text-xl font-black">{i + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-xl font-black text-white tracking-tight group-hover:text-primary transition-colors">{m.title}</h4>
                  <span className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-700 group-hover:text-zinc-400 transition-all">Launch →</span>
                </div>
                <p className="text-zinc-500 text-sm mb-6 leading-relaxed max-w-2xl">{m.description}</p>
                <div className="flex flex-wrap gap-2">
                  {m.topics.map(t => <span key={t} className="px-3 py-1 bg-white/5 text-zinc-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/5">{t}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-10 pt-20">
        <div className="space-y-2 px-1">
           <h3 className="text-2xl font-black text-white tracking-tight">Discover Specialized Paths</h3>
           <p className="text-sm text-zinc-500 font-medium">Neural recommendations based on your mastery of "{profile.topic}".</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {suggested.map((title, i) => (
            <div 
              key={i} 
              className="premium-card p-8 cursor-pointer group hover:bg-white/[0.04] transition-all border-dashed border-white/10 hover:border-solid hover:border-white/20"
              onClick={() => onSelectSuggested(title)}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-white group-hover:text-black transition-all">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <span className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.4em] mb-4 block">Neural Link {i + 1}</span>
              <h4 className="text-base font-black text-white mb-6 group-hover:text-primary transition-colors leading-snug">{title}</h4>
              <p className="text-xs text-zinc-500 mb-8 leading-relaxed">Synthesize a complete expert-curated curriculum for this domain instantly.</p>
              <div className="text-[10px] font-black text-white/30 group-hover:text-white flex items-center gap-2 transition-all uppercase tracking-[0.3em]">
                Initialize Path <svg className="w-3 h-3 translate-x-0 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7" /></svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TutorSessionView: React.FC<{ profile: UserProfile, currentModule: Module, onBack: () => void }> = ({ profile, currentModule, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Identity verified, ${profile.name}. Initializing the "${currentModule.title}" node. To begin our session, how would you describe the fundamental objective of this concept in your own words?`, timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const youtubeId = getYoutubeEmbedId(currentModule.videoUrl);

  useEffect(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory); setInput(''); setIsTyping(true);
    try {
      const reply = await getTutorResponse(newHistory, profile, currentModule.title);
      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: Date.now() }]);
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  };

  return (
    <div className="flex flex-col h-[88vh] premium-card mt-6 overflow-hidden animate-in zoom-in-98 duration-700 bg-black shadow-2xl">
      <div className="px-10 py-6 border-b border-white/5 flex justify-between items-center z-20 bg-black/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-5">
          <div className="relative">
<div className="w-3 h-3 rounded-full bg-zinc-400 shadow-[0_0_15px_rgba(255,255,255,0.3)]"></div>
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-zinc-400 animate-ping opacity-40"></div>
          </div>
          <div>
             <h3 className="text-sm font-black text-white tracking-tight leading-none uppercase italic">Socratic Inquiry</h3>
             <p className="text-[9px] font-black text-zinc-600 uppercase mt-2 tracking-[0.3em]">{currentModule.title}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} className="text-[10px] font-black tracking-[0.2em] uppercase hover:bg-white hover:text-black rounded-full px-6">Terminate</Button>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-zinc-950 flex flex-col">
        {youtubeId && (
          <div className="w-full bg-black border-b border-white/5 p-8 sm:p-14">
             <div className="max-w-3xl mx-auto aspect-video rounded-3xl overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl relative group">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&modestbranding=1&rel=0&showinfo=0&controls=1`} 
                  title="Educational Content" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="relative z-10"
                ></iframe>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-20"></div>
             </div>
             <div className="mt-10 max-w-3xl mx-auto flex flex-col gap-4 px-2">
                <div className="flex items-center gap-4">
                   <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em]">Verified Content Grounding</span>
                   <div className="h-px flex-1 bg-white/5"></div>
                </div>
                <div className="flex flex-wrap gap-4">
                  {currentModule.sources?.map((s, idx) => (
                    <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-zinc-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-xl border border-white/5 font-bold italic">{s.title}</a>
                  ))}
                  {!currentModule.sources?.length && <span className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.2em]">Source Mapping Verified via Intelligent Search</span>}
                </div>
             </div>
          </div>
        )}
        
        <div className="p-10 space-y-12 min-h-[400px]">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'assistant' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-4 duration-500`}>
              <div className={`max-w-[85%] p-7 rounded-[1.5rem] text-[15px] font-medium leading-relaxed border transition-all ${m.role === 'assistant' ? 'bg-zinc-900/40 border-white/5 text-zinc-300 shadow-xl' : 'bg-white border-white text-black font-black shadow-[0_10px_40px_rgba(255,255,255,0.1)]'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {isTyping && (
             <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex gap-2">
                   <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                   <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                   <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
             </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="p-8 bg-black/80 border-t border-white/5 shrink-0 backdrop-blur-2xl">
        <div className="flex gap-4 max-w-4xl mx-auto">
          <input 
            autoFocus 
            className="flex-1 px-8 py-5 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-white/20 outline-none font-bold text-base text-white placeholder:text-zinc-800 shadow-inner" 
            placeholder="Document your discovery..." 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSend()} 
          />
          <Button size="icon" className="w-16 h-16 shrink-0 rounded-2xl shadow-2xl shadow-white/5 group" onClick={handleSend} disabled={isTyping || !input.trim()}>
            <svg className="w-7 h-7 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7-7 7" /></svg>
          </Button>
        </div>
      </div>
    </div>
  );
};

const QuizView: React.FC<{ quiz: Quiz, onComplete: (s: number, t: number) => void, onBack: () => void }> = ({ quiz, onComplete, onBack }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const handleNext = () => {
    if (selected === null) return;
    const newAnswers = [...answers, selected]; setAnswers(newAnswers); setSelected(null);
    if (currentIdx < quiz.questions.length - 1) { setCurrentIdx(currentIdx + 1); }
    else { const s = newAnswers.reduce((acc, ans, i) => ans === quiz.questions[i].correctAnswer ? acc + 1 : acc, 0); setShowResult(true); onComplete(s, quiz.questions.length); }
  };

  if (showResult) {
    const s = answers.reduce((acc, ans, i) => ans === quiz.questions[i].correctAnswer ? acc + 1 : acc, 0);
    const passed = (s / quiz.questions.length) >= 0.8;
    return (
      <div className="premium-card p-20 text-center mt-20 animate-in zoom-in-95 duration-1000 bg-black/90 shadow-[0_0_100px_rgba(255,255,255,0.02)]">
        <div className={`w-24 h-24 mx-auto rounded-[2.5rem] flex items-center justify-center text-5xl font-black mb-12 shadow-2xl transition-all duration-1000 italic ${passed ? 'bg-white text-black' : 'bg-white/5 text-zinc-800 border border-white/10'}`}>
          {passed ? 'S' : 'F'}
        </div>
        <h2 className="text-5xl font-black text-white mb-6 tracking-tighter">Assessment Concluded</h2>
        <p className="text-zinc-600 font-black uppercase tracking-[0.5em] mb-16 text-sm">Node Final Metric: {s} / {quiz.questions.length}</p>
        <div className="max-w-sm mx-auto">
           <Button size="lg" className="w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-white/5" onClick={onBack}>Conclude Session</Button>
        </div>
      </div>
    );
  }

  const q = quiz.questions[currentIdx];
  return (
    <div className="premium-card p-16 mt-12 animate-in slide-in-from-right-12 duration-700 bg-black/40 backdrop-blur-3xl">
      <div className="flex justify-between items-center mb-20">
        <div className="space-y-4">
          <span className="text-[10px] font-black text-white uppercase tracking-[0.5em]">Question {currentIdx + 1} / {quiz.questions.length}</span>
          <div className="h-1.5 w-72 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-white transition-all duration-700 shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ width: `${((currentIdx + 1) / quiz.questions.length) * 100}%` }} />
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 hover:text-white transition-colors">Abort Matrix</Button>
      </div>
      <h3 className="text-4xl font-black text-white mb-20 leading-tight tracking-tight max-w-3xl italic">{q.question}</h3>
      <div className="grid gap-4 max-w-3xl">
        {q.options.map((opt, i) => (
          <button 
            key={i} 
            onClick={() => setSelected(i)} 
            className={`w-full p-7 text-left rounded-3xl border-2 font-black transition-all flex items-center gap-8 text-base group relative overflow-hidden ${selected === i ? 'border-white bg-white text-black shadow-2xl shadow-white/10' : 'border-white/5 bg-black/40 text-zinc-500 hover:border-white/20'}`}
          >
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all font-black text-xs ${selected === i ? 'bg-black border-black text-white' : 'border-white/10 text-zinc-700 group-hover:text-white group-hover:border-white'}`}>
              {String.fromCharCode(65 + i)}
            </span>
            <span className="relative z-10">{opt}</span>
          </button>
        ))}
      </div>
      <div className="mt-24 flex justify-end">
        <Button size="lg" className="h-16 px-16 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-white/5" disabled={selected === null} onClick={handleNext}>
          {currentIdx === quiz.questions.length - 1 ? 'Finalize Evaluaton' : 'Next Criterion →'}
        </Button>
      </div>
    </div>
  );
};

const FeedbackView: React.FC<{ onSelect: (f: SessionFeedback) => void }> = ({ onSelect }) => (
  <div className="premium-card p-20 text-center mt-20 animate-in zoom-in-95 duration-1000 bg-black shadow-2xl">
    <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">Session Calibration</h2>
    <p className="text-zinc-600 font-black mb-24 text-[10px] tracking-[0.5em] uppercase">Recursive Matrix Refinement Required</p>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 max-w-2xl mx-auto">
      {['easy', 'medium', 'hard'].map((f: any) => (
        <button 
          key={f} 
          className="h-40 flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-white/5 bg-white/[0.02] hover:bg-white hover:text-black hover:border-white transition-all group p-8 shadow-xl"
          onClick={() => onSelect(f)}
        >
          <span className="text-[11px] font-black uppercase tracking-[0.4em] group-hover:text-black mb-3 italic">{f}</span>
          <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest leading-relaxed">
            {f === 'easy' ? 'Nominal Load' : f === 'medium' ? 'Optimal Balance' : 'Extreme Threshold'}
          </span>
        </button>
      ))}
    </div>
  </div>
);

const CourseCatalogView: React.FC<{ onSelectSubject: (s: Subject) => void; onBack: () => void }> = ({ onSelectSubject, onBack }) => (
  <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
    <div className="flex items-center gap-4 mb-10">
      <button onClick={onBack} className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all bg-card">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Explore Courses</h2>
    </div>
    <p className="text-muted-foreground mb-10 text-sm font-medium">Select a subject to start learning</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {courseData.map((subject) => (
        <button
          key={subject.id}
          onClick={() => onSelectSubject(subject)}
          className="premium-card p-6 text-left group hover:bg-accent transition-all relative overflow-hidden"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={subject.icon} />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground">{subject.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{subject.playlists.length} playlists</p>
          <div className="flex flex-wrap gap-2">
            {[...new Set(subject.playlists.map(p => p.classRange))].map((cls) => (
              <span key={cls} className="text-xs font-medium px-2 py-1 rounded-md bg-muted text-muted-foreground">{cls}</span>
            ))}
          </div>
        </button>
      ))}
    </div>
  </div>
);

const LearnView: React.FC<{ subject: Subject; onSelectPlaylist: (p: Playlist) => void; onBack: () => void }> = ({ subject, onSelectPlaylist, onBack }) => {
  const classGroups = subject.playlists.reduce((acc, playlist) => {
    const key = playlist.classRange;
    if (!acc[key]) acc[key] = [];
    acc[key].push(playlist);
    return acc;
  }, {} as Record<string, Playlist[]>);

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all bg-card">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={subject.icon} />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{subject.name}</h2>
          <p className="text-sm text-muted-foreground">{subject.playlists.length} learning paths</p>
        </div>
      </div>

      {Object.entries(classGroups).map(([classRange, playlists]: [string, Playlist[]]) => (
        <div key={classRange} className="mb-10">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {classRange}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => onSelectPlaylist(playlist)}
                className="premium-card p-5 text-left group hover:bg-accent transition-all"
              >
                <h4 className="text-base font-medium text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">{playlist.title}</h4>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{playlist.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                    {playlist.videoCount} videos
                  </span>
                  <span className="text-xs font-medium text-primary flex items-center gap-1">
                    Start <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7" /></svg>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const PlaylistTutorView: React.FC<{ playlist: Playlist; subject: Subject | null; onBack: () => void }> = ({ playlist, subject, onBack }) => {
  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all bg-card">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-foreground">{playlist.title}</h2>
          <p className="text-sm text-muted-foreground">{subject?.name} • {playlist.classRange}</p>
        </div>
      </div>

      <div className="premium-card p-8 mb-8">
        <p className="text-muted-foreground mb-6">{playlist.description}</p>
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
            {playlist.videoCount} Videos
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            {playlist.classRange}
          </span>
        </div>
        <a 
          href={playlist.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Watch on YouTube
        </a>
      </div>
    </div>
  );
};

export default App;
