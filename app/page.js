'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, RefreshCw, BarChart2, Lightbulb, GraduationCap, Sparkles, Save, Trash2, SkipForward, Eye, Key, Brain, BookOpen, ImageIcon
} from 'lucide-react';

// Import modular components
import { PDFViewer, AdaptiveInput, MarkdownText, FileUploadZone, FeedbackBlock, PaperLibrary } from './components';

// Import custom hooks and services
import useExamLogic from './hooks/useExamLogic';
import { AIService, evaluateAnswerLocally, buildHintFromScheme, buildExplanationFromFeedback, buildFollowUpReply, buildStudyPlan, checkRegex, stringifyAnswer, DEFAULT_MODELS } from './services/AIService';
import { PaperStorage } from './services/PaperStorage';

export default function GCSEMarkerApp() {
  // Phase management
  const [phase, setPhase] = useState('upload');
  const [files, setFiles] = useState({ paper: null, scheme: null, insert: null });
  const [error, setError] = useState(null);
  const [parsingStatus, setParsingStatus] = useState('');

  // PDF viewer state
  const [activePdfTab, setActivePdfTab] = useState('paper');
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.5);

  // API keys and model selection
  const [customApiKey, setCustomApiKey] = useState("");
  const [hackClubApiKey, setHackClubApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODELS.vision);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [hasServerKey, setHasServerKey] = useState(true); // Assume server has OpenRouter key initially
  const [hasHackClubServerKey, setHasHackClubServerKey] = useState(true); // Assume server has Hack Club key initially

  // Loading states
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [hintData, setHintData] = useState({ loading: false, text: null });
  const [explanationData, setExplanationData] = useState({ loading: false, text: null });
  const [studyPlan, setStudyPlan] = useState({ loading: false, content: null });
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Use custom exam logic hook
  const exam = useExamLogic();

  // Load API keys and model from localStorage, check server keys
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedKey = window.localStorage.getItem('openrouter_api_key');
    if (storedKey) setCustomApiKey(storedKey);
    const storedHackKey = window.localStorage.getItem('hackclub_api_key');
    if (storedHackKey) setHackClubApiKey(storedHackKey);
    const storedModel = window.localStorage.getItem('selected_model');
    if (storedModel) setSelectedModel(storedModel);

    // Check for saved session
    const savedData = window.localStorage.getItem('gcse_marker_state');
    if (savedData) setHasSavedSession(true);

    // Check if server has API keys configured
    AIService.checkServerKey().then(hasKey => setHasServerKey(hasKey));
    AIService.checkHackClubServerKey().then(hasKey => setHasHackClubServerKey(hasKey));
  }, []);

  // Auto-restore session on mount
  useEffect(() => {
    const restored = exam.restoreSession();
    if (restored) {
      setHasSavedSession(true);
      setPhase('exam');
    }
  }, [exam.restoreSession]);

  // Persist session on changes
  useEffect(() => {
    exam.saveSession(phase);
    if (phase === 'exam' && exam.activeQuestions.length > 0) setHasSavedSession(true);
  }, [exam.activeQuestions, exam.userAnswers, exam.feedbacks, exam.currentQIndex, phase, exam.saveSession]);

  // Timer
  useEffect(() => {
    let timer;
    if (phase === 'exam') timer = setInterval(() => setTimeElapsed(p => p + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Save API keys and model
  const updateApiKey = (k) => { setCustomApiKey(k); if (typeof window !== 'undefined') window.localStorage.setItem('openrouter_api_key', k); };
  const updateHackClubKey = (k) => { setHackClubApiKey(k); if (typeof window !== 'undefined') window.localStorage.setItem('hackclub_api_key', k); };
  const updateSelectedModel = (m) => { setSelectedModel(m); if (typeof window !== 'undefined') window.localStorage.setItem('selected_model', m); };

  const clearSaveData = () => {
    exam.clearSession();
    setHasSavedSession(false);
    window.location.reload();
  };

  const resumeSavedSession = () => {
    const restored = exam.restoreSession();
    if (restored) { setHasSavedSession(true); setPhase('exam'); }
  };

  const jumpToPdfPage = useCallback((pageNumber, type = 'paper') => {
    setActivePdfTab(type);
    setPdfPage(pageNumber);
  }, []);

  const advanceToQuestionPage = useCallback((index) => {
    if (index < exam.activeQuestions.length && exam.activeQuestions[index].pageNumber) {
      setActivePdfTab('paper');
      setPdfPage(exam.activeQuestions[index].pageNumber);
    }
  }, [exam.activeQuestions]);

  // Memoized answer change handler
  const onAnswerChange = useCallback((val) => {
    if (exam.currentQuestion) {
      exam.handleAnswerChange(exam.currentQuestion.id, val);
    }
  }, [exam.currentQuestion, exam.handleAnswerChange]);

  const handleSavePaper = async () => {
    if (!files.paper) return;
    setIsSaving(true);
    try {
      await PaperStorage.uploadPaper(files.paper, files.scheme, files.insert, {
        name: files.paper.name.replace('.pdf', ''),
        year: new Date().getFullYear()
      });
      alert("Paper saved to library!");
    } catch (e) {
      console.error(e);
      alert("Failed to save paper: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectPaper = async (paperData) => {
    setParsingStatus("Loading paper from library...");
    try {
      const loadFile = async (data) => {
        if (!data) return null;
        const res = await fetch(data.url);
        const blob = await res.blob();
        const file = new File([blob], data.name, { type: 'application/pdf' });
        file.fromLibrary = true;
        return file;
      };

      const [p, s, i] = await Promise.all([
        loadFile(paperData.paper),
        loadFile(paperData.scheme),
        loadFile(paperData.insert)
      ]);

      setFiles({ paper: p, scheme: s, insert: i });
    } catch (e) {
      console.error(e);
      alert("Failed to load paper.");
    } finally {
      setParsingStatus("");
    }
  };

  // Start parsing PDFs
  const handleStartParsing = async () => {
    if (!files.paper) return;
    setPhase('parsing');
    setError(null);
    exam.setActiveQuestions([]);

    try {
      setParsingStatus('AI analyzing exam paper...');
      const { questions, metadata } = await AIService.extractQuestions(files.paper, files.insert, customApiKey, selectedModel);
      if (questions.length === 0) throw new Error('No questions were extracted.');

      if (files.insert) {
        setParsingStatus('Processing source material...');
        try {
          const insertContent = await AIService.extractInsertContent(files.insert, customApiKey, selectedModel);
          exam.setInsertContent(insertContent);
        } catch (e) { console.error('Insert extraction failed:', e); }
      }

      if (files.scheme) {
        setParsingStatus('Parsing mark scheme...');
        try {
          const markScheme = await AIService.parseMarkScheme(files.scheme, customApiKey, selectedModel);
          exam.setParsedMarkScheme(markScheme);
        } catch (e) { console.error('Mark scheme parsing failed:', e); }
      }

      setParsingStatus('Loading questions...');
      for (let i = 0; i < questions.length; i++) {
        await new Promise(r => setTimeout(r, 50));
        exam.setActiveQuestions(prev => [...prev, questions[i]]);
      }

      setParsingStatus('Ready!');

      // Auto-save to library if not already saved
      if (!files.paper.fromLibrary) {
        setParsingStatus('Saving to cloud library...');
        try {
          // Fire and forget - or await if you want to ensure it's saved before starting
          // Awaiting ensures we don't navigate away while uploading
          await PaperStorage.uploadPaper(files.paper, files.scheme, files.insert, {
            name: files.paper.name.replace(/\.pdf$/i, ''),
            ...metadata // Spread AI-extracted metadata (subject, board, year, etc)
          });
        } catch (storageErr) {
          console.error("Failed to auto-save paper:", storageErr);
          // We don't stop the exam if save fails, just log it
        }
      }

      await new Promise(r => setTimeout(r, 300));
      setPhase('exam');
      if (questions[0]?.pageNumber) setPdfPage(questions[0].pageNumber);
    } catch (err) {
      setError(err.message);
      setPhase('upload');
    }
  };

  // Submit answer handler
  const handleSubmitAnswer = async () => {
    const q = exam.currentQuestion;
    const answer = exam.userAnswers[q.id];

    // Check if answer has content
    let hasContent = false;
    if (q.type === 'graph_drawing') hasContent = answer && (answer.points?.length > 0 || answer.lines?.length > 0);
    else hasContent = Array.isArray(answer) ? answer.flat().some(cell => cell && String(cell).trim() !== '') : (answer !== undefined && answer !== null && String(answer).trim() !== '');
    if (!hasContent) return;

    if (exam.skippedQuestions.has(q.id)) exam.unskipQuestion(q.id);

    // Regex check for simple answers
    if (q.markingRegex && (typeof answer === 'string' || typeof answer === 'number')) {
      if (checkRegex(q.markingRegex, String(answer).trim())) {
        exam.setQuestionFeedback(q.id, { score: q.marks, totalMarks: q.marks, text: "Correct! (Auto-verified)", rewrite: `**${answer}**` });
        return;
      }
    }

    setLoadingFeedback(true);
    setExplanationData({ loading: false, text: null });

    try {
      const scheme = exam.parsedMarkScheme[q.id];
      const keyToUse = hackClubApiKey || hackClubApiKeyDefault;
      if (!keyToUse) throw new Error("Hack Club API key missing for marking.");

      const feedback = await AIService.markQuestion(q, answer, scheme, keyToUse, customApiKey, selectedModel);
      exam.setQuestionFeedback(q.id, feedback);
    } catch (err) {
      const scheme = exam.parsedMarkScheme[q.id];
      const fallback = evaluateAnswerLocally(q, answer, scheme);
      const message = err?.message?.includes("Hack Club") ? "Add a Hack Club API key for marking. Local estimate:" : "Marking failed. Local estimate:";
      exam.setQuestionFeedback(q.id, { score: Math.min(fallback.score || 0, q.marks), totalMarks: q.marks, text: `${message} ${fallback.text}`, rewrite: fallback.rewrite });
    }
    setLoadingFeedback(false);
  };

  // Skip question
  const handleSkip = () => {
    const result = exam.skipQuestion(exam.currentQuestion.id);
    if (result.index !== -1) advanceToQuestionPage(result.index);
    else setPhase('summary');
  };

  // Move to next question
  const handleNext = () => {
    setHintData({ loading: false, text: null });
    setExplanationData({ loading: false, text: null });
    const result = exam.moveToNext();
    if (result.index !== -1) advanceToQuestionPage(result.index);
    else setPhase('summary');
  };

  // Get hint
  const handleGetHint = async () => {
    const q = exam.currentQuestion;
    setHintData({ loading: true, text: null });
    const scheme = exam.parsedMarkScheme[q.id];
    const keyToUse = hackClubApiKey || hackClubApiKeyDefault;

    if (!keyToUse) {
      setHintData({ loading: false, text: buildHintFromScheme(q, scheme) });
      return;
    }
    try {
      const response = await AIService.getHint(q, scheme, keyToUse);
      setHintData({ loading: false, text: response });
    } catch (e) {
      setHintData({ loading: false, text: buildHintFromScheme(q, scheme) });
    }
  };

  // Explain feedback
  const handleExplainFeedback = async () => {
    const q = exam.currentQuestion;
    const answer = exam.userAnswers[q.id];
    const feedback = exam.feedbacks[q.id];
    setExplanationData({ loading: true, text: null });
    const scheme = exam.parsedMarkScheme[q.id];
    const keyToUse = hackClubApiKey || hackClubApiKeyDefault;

    if (!keyToUse) {
      setExplanationData({ loading: false, text: buildExplanationFromFeedback(q, answer, feedback, scheme) });
      return;
    }
    try {
      const response = await AIService.explainFeedback(q, answer, feedback, scheme, keyToUse);
      setExplanationData({ loading: false, text: response });
    } catch (e) {
      setExplanationData({ loading: false, text: buildExplanationFromFeedback(q, answer, feedback, scheme) });
    }
  };

  // Follow-up chat
  const handleFollowUp = async (userText) => {
    const q = exam.currentQuestion;
    const currentChat = exam.followUpChats[q.id] || [];
    exam.addFollowUpMessage(q.id, { role: 'user', text: userText });
    setSendingFollowUp(true);

    const feedback = exam.feedbacks[q.id] || {};
    const keyToUse = hackClubApiKey || hackClubApiKeyDefault;

    if (!keyToUse) {
      const response = buildFollowUpReply(userText, q, feedback);
      exam.addFollowUpMessage(q.id, { role: 'ai', text: response });
      setSendingFollowUp(false);
      return;
    }
    try {
      const newChat = [...currentChat, { role: 'user', text: userText }];
      const response = await AIService.followUp(q, exam.userAnswers[q.id], feedback, newChat, keyToUse);
      exam.addFollowUpMessage(q.id, { role: 'ai', text: response });
    } catch (e) {
      exam.addFollowUpMessage(q.id, { role: 'ai', text: buildFollowUpReply(userText, q, feedback) });
    }
    setSendingFollowUp(false);
  };

  // Generate study plan
  const handleGenerateStudyPlan = async (percentage) => {
    setStudyPlan({ loading: true, content: null });
    const stats = exam.getSummaryStats();
    const keyToUse = hackClubApiKey || hackClubApiKeyDefault;

    if (!keyToUse) {
      setStudyPlan({ loading: false, content: buildStudyPlan(percentage, stats.weaknessCounts) });
      return;
    }
    try {
      const response = await AIService.generateStudyPlan(percentage, stats.weaknessCounts, exam.activeQuestions.length, keyToUse);
      setStudyPlan({ loading: false, content: response });
    } catch (e) {
      setStudyPlan({ loading: false, content: buildStudyPlan(percentage, stats.weaknessCounts) });
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // === RENDER PHASES ===

  if (phase === 'upload') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center font-sans">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 relative">
          {hasSavedSession && (
            <div className="absolute top-4 right-4 animate-in fade-in">
              <button onClick={resumeSavedSession} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-green-200 transition-colors"><Save className="w-4 h-4" /> Resume Session</button>
            </div>
          )}
          <div className="text-center mb-10"><h1 className="text-3xl font-bold text-slate-900">AI GCSE Marker</h1><p className="text-slate-500 mt-2">Upload your past papers.</p></div>
          {error && <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">{error}</div>}

          {!hasServerKey && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">OpenRouter API Key</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Key className="h-5 w-5 text-slate-400" /></div>
                <input type="password" value={customApiKey} onChange={(e) => updateApiKey(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Enter your OpenRouter API Key" />
              </div>
              <p className="mt-1 text-xs text-slate-500">Get your key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">openrouter.ai/keys</a>. Stored locally.</p>
            </div>
          )}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">AI Model</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Brain className="h-5 w-5 text-slate-400" /></div>
              <input
                type="text"
                value={selectedModel}
                onChange={(e) => updateSelectedModel(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., google/gemini-2.0-flash-001"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">Enter any OpenRouter model ID. Browse models at <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">openrouter.ai/models</a></p>
          </div>
          {!hasHackClubServerKey && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Hack Club API Key (Marking)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Key className="h-5 w-5 text-slate-400" /></div>
                <input type="password" value={hackClubApiKey} onChange={(e) => updateHackClubKey(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Enter Hack Club key for marking" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <FileUploadZone label="Question Paper" file={files.paper} onUpload={(f) => setFiles(prev => ({ ...prev, paper: f }))} />
            <div className="grid grid-cols-2 gap-4">
              <FileUploadZone label="Mark Scheme" file={files.scheme} onUpload={(f) => setFiles(prev => ({ ...prev, scheme: f }))} />
              <FileUploadZone label="Insert / Source" file={files.insert} onUpload={(f) => setFiles(prev => ({ ...prev, insert: f }))} />
            </div>
            {files.paper && (
              <div className="flex justify-end">
                <button
                  onClick={handleSavePaper}
                  disabled={isSaving}
                  className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save to Library
                </button>
              </div>
            )}
          </div>

          <div className="my-6 border-t border-slate-100 pt-6">
            <PaperLibrary onSelectPaper={handleSelectPaper} />
          </div>
          <button disabled={!files.paper || (!hasServerKey && !customApiKey)} onClick={handleStartParsing} className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${files.paper && (hasServerKey || customApiKey) ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>Start AI Analysis</button>
        </div>
      </div>
    );
  }

  if (phase === 'parsing') {
    return <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-mono"><div className="flex items-center gap-3 text-indigo-400"><RefreshCw className="w-6 h-6 animate-spin" /><span className="text-xl font-semibold">{parsingStatus}</span></div></div>;
  }

  if (phase === 'exam' && exam.currentQuestion) {
    const question = exam.currentQuestion;
    const hasFeedback = !!exam.feedbacks[question.id];

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col h-screen overflow-hidden font-sans">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-4"><div className="bg-indigo-600 text-white font-bold px-3 py-1 rounded">GCSE Mock</div><h2 className="text-slate-700 font-semibold hidden sm:block">{files.paper?.name || "Mock Paper"}</h2></div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end"><span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Time</span><span className="font-mono text-xl text-slate-800 font-bold">{formatTime(timeElapsed)}</span></div>
            <div className="flex flex-col items-end"><span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Q</span><span className="text-sm font-semibold text-slate-700">{exam.currentQIndex + 1} / {exam.activeQuestions.length}</span></div>
            <button onClick={clearSaveData} className="text-slate-400 hover:text-red-500" title="Reset Session"><Trash2 className="w-5 h-5" /></button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden h-[calc(100vh-64px)]">
          {/* PDF Viewer (Memoized) */}
          <PDFViewer
            file={activePdfTab === 'paper' ? files.paper : files.insert}
            pageNumber={pdfPage}
            scale={pdfScale}
            onPageChange={setPdfPage}
            onScaleChange={setPdfScale}
            activePdfTab={activePdfTab}
            onTabChange={setActivePdfTab}
            hasInsert={!!files.insert}
          />

          {/* Right Panel: Exam Interface */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-white relative">
            <div className="max-w-3xl mx-auto w-full p-6 md:p-10 pb-32">
              <div className="mb-8 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-3">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium">{question.section}</span>
                    <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-sm font-medium border border-orange-100">{question.marks} Marks</span>
                  </div>
                  {!hasFeedback && (
                    <button onClick={handleGetHint} disabled={hintData.loading || hintData.text} className="flex items-center gap-2 text-sm text-amber-600 hover:bg-amber-50 px-3 py-1 rounded-full transition-colors disabled:opacity-50">
                      {hintData.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}{hintData.text ? "Hint Used" : "Get Hint"}
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-start gap-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight"><span className="text-slate-300 mr-2">{question.id}.</span>{question.question}</h1>
                  {question.pageNumber && (
                    <button onClick={() => jumpToPdfPage(question.pageNumber)} className="flex-shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors" title={`View Page ${question.pageNumber}`}><Eye className="w-5 h-5" /><span>Page {question.pageNumber}</span></button>
                  )}
                </div>

                {question.relatedFigure && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-3"><ImageIcon className="w-5 h-5 text-blue-500" /><div><p className="text-sm font-bold text-blue-900">Figure Referenced</p><p className="text-xs text-blue-700">{question.relatedFigure}</p></div></div>
                    {question.figurePage && <button onClick={() => jumpToPdfPage(question.figurePage)} className="bg-white text-blue-600 px-3 py-2 rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition-all border border-blue-100">View Figure (Pg {question.figurePage})</button>}
                  </div>
                )}
                {hintData.text && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3 animate-in slide-in-from-top-2">
                    <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-amber-800 text-sm font-medium"><MarkdownText text={hintData.text} /></div>
                  </div>
                )}
              </div>

              <div className={`transition-opacity duration-300 ${hasFeedback ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                {/* CRITICAL FIX: key={question.id} forces React to destroy and recreate on question change */}
                <AdaptiveInput key={question.id} type={question.type} options={question.options} listCount={question.listCount} tableStructure={question.tableStructure} graphConfig={question.graphConfig} value={exam.userAnswers[question.id]} onChange={onAnswerChange} />
                {question.type === 'long_text' && (
                  <div className="mt-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><BookOpen className="w-4 h-4 text-indigo-600" /> Quote Scratchpad</div>
                      <span className="text-xs text-slate-500">Paste lines from the PDF, then insert.</span>
                    </div>
                    <textarea className="w-full h-20 p-3 rounded-md border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white" placeholder="Copy a key quote or stage direction here..." value={exam.quoteDrafts[question.id] || ''} onChange={(e) => exam.updateQuoteDraft(question.id, e.target.value)} />
                    <div className="flex justify-end mt-2">
                      <button onClick={() => exam.insertQuoteIntoAnswer(question.id)} disabled={!exam.quoteDrafts[question.id]?.trim()} className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-md font-bold hover:bg-indigo-700 disabled:opacity-50">Insert Quote into Answer</button>
                    </div>
                  </div>
                )}
              </div>

              {!hasFeedback && (
                <div className="mt-8 flex justify-end gap-3">
                  <button onClick={handleSkip} className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-2">Skip <SkipForward className="w-5 h-5" /></button>
                  <button onClick={handleSubmitAnswer} disabled={!exam.userAnswers[question.id] || loadingFeedback} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loadingFeedback ? <><RefreshCw className="w-5 h-5 animate-spin" /> Marking...</> : <><CheckCircle className="w-5 h-5" /> Submit Answer</>}
                  </button>
                </div>
              )}

              <FeedbackBlock feedback={exam.feedbacks[question.id]} onNext={handleNext} onExplain={handleExplainFeedback} explaining={explanationData.loading} explanation={explanationData.text} questionId={question.id} onFollowUp={handleFollowUp} followUpChat={exam.followUpChats[question.id]} sendingFollowUp={sendingFollowUp} />
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300">
                {exam.activeQuestions.map((q, idx) => {
                  const isDone = !!exam.feedbacks[q.id];
                  const isSkipped = exam.skippedQuestions.has(q.id);
                  const isCurrent = exam.currentQIndex === idx;
                  let bgColor = "bg-slate-100 text-slate-500 hover:bg-slate-200";
                  if (isCurrent) bgColor = "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200";
                  else if (isDone) bgColor = "bg-green-100 text-green-700 border border-green-200";
                  else if (isSkipped) bgColor = "bg-amber-100 text-amber-700 border border-amber-200";
                  return <button key={q.id} onClick={() => { exam.setCurrentQIndex(idx); advanceToQuestionPage(idx); }} className={`flex-shrink-0 w-10 h-10 rounded-lg font-bold text-sm flex items-center justify-center transition-all ${bgColor}`}>{q.id}</button>;
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (phase === 'summary') {
    const stats = exam.getSummaryStats();
    const weaknessList = Object.entries(stats.weaknessCounts).sort((a, b) => b[1] - a[1]);

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
          <div className="md:w-1/3 bg-indigo-600 p-8 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-indigo-500 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20px 20px, white 2px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            <div className="relative z-10"><h2 className="text-2xl font-bold mb-1">Result Summary</h2><p className="text-indigo-200">GCSE Mock Paper</p></div>
            <div className="relative z-10 text-center py-10"><div className="w-32 h-32 rounded-full border-8 border-indigo-400 mx-auto flex items-center justify-center mb-4 bg-indigo-700"><span className="text-5xl font-bold">{stats.grade}</span></div><p className="font-bold text-xl uppercase tracking-widest">Grade</p></div>
            <div className="relative z-10"><div className="flex justify-between border-b border-indigo-500 pb-2 mb-2"><span>Raw Marks</span><span className="font-bold">{stats.totalScore} / {stats.totalPossible}</span></div><div className="flex justify-between"><span>Percentage</span><span className="font-bold">{stats.percentage}%</span></div></div>
          </div>
          <div className="md:w-2/3 p-8 md:p-12 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center gap-2 mb-6"><BarChart2 className="w-6 h-6 text-indigo-600" /><h3 className="text-2xl font-bold text-slate-800">Performance Breakdown</h3></div>
            <div className="space-y-3 mb-8">
              {weaknessList.length ? weaknessList.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                  <div className="text-sm font-semibold text-slate-700">{name}</div>
                  <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">{count}x</span>
                </div>
              )) : (
                <p className="text-sm text-slate-400">Not enough data to detect repeated weaknesses.</p>
              )}
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-indigo-600" /> Next Steps</h4>
                {!studyPlan.content && (
                  <button onClick={() => handleGenerateStudyPlan(stats.percentage)} disabled={studyPlan.loading} className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">
                    {studyPlan.loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Generate Study Plan
                  </button>
                )}
              </div>
              {studyPlan.loading && <div className="text-slate-500 text-sm flex items-center gap-2 animate-pulse"><Brain className="w-4 h-4" /> Analyzing your weaknesses...</div>}
              {studyPlan.content ? (
                <div className="prose prose-sm prose-indigo text-slate-600 animate-in fade-in"><MarkdownText text={studyPlan.content} /></div>
              ) : (!studyPlan.loading && <p className="text-sm text-slate-400 italic">Click the button above to auto-generate a revision strategy.</p>)}
            </div>
            <div className="mt-8 flex justify-end"><button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors">Upload Another Paper</button></div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
