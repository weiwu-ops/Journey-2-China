"use client";
import { useState, useEffect } from 'react';
import { useStore } from './store';
import { useRouter } from 'next/navigation';
import { Award, Check, Sparkles, X, Settings, MapPin, Users } from 'lucide-react';

// 默认深蓝色正圆头像框 (SVG Base64)
const DEFAULT_BLUE_FRAME = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='46' fill='none' stroke='%231d4ed8' stroke-width='8'/></svg>";

export default function GamePage() {
  const router = useRouter();
  const { data, saveData, fetchData } = useStore();
  const [activeMapId, setActiveMapId] = useState("main");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [customPointsInput, setCustomPointsInput] = useState("");
  const [sidebarTab, setSidebarTab] = useState("current"); // "current" | "all"

  // 提示动画与弹窗状态
  const [noticeMessage, setNoticeMessage] = useState("");
  const [celebrationStudent, setCelebrationStudent] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  if (!data) return <div className="p-10 text-center text-white text-xl font-bold">加载冒险大地图中...</div>;

  const currentMapData = activeMapId === 'main' ? data.mainMap : data.subMaps?.find(m => m.id === activeMapId);
  const achievementsList = data.achievements || [];

  // 侧边栏学生列表过滤
  const filteredStudents = (data.students || []).filter(stu => {
    if (activeMapId === 'main' || sidebarTab === 'all') return true;
    return (stu.currentMap || 'main') === activeMapId;
  });

  // 弹窗选中学生
  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setShowFramePicker(false);
    setCustomPointsInput("");
  };

  // 核心得分、前进动画与庆祝逻辑
  const handleUpdatePoints = async (delta) => {
    if (!selectedStudent) return;

    const oldTotal = selectedStudent.points || 0;
    const oldStationPts = selectedStudent.stationPoints || 0;
    const newTotal = Math.max(0, oldTotal + delta);
    const newStationPts = Math.max(0, oldStationPts + delta);
    const newStars = Math.floor(newTotal / 50);

    // 检查是否在分站且每满10分前进站点
    let newStationIdx = selectedStudent.currentStationIndex || 0;
    let advancedNotice = "";

    if (activeMapId !== 'main' && currentMapData?.stations?.length) {
      const stationCount = currentMapData.stations.length;
      const steps = Math.floor(newStationPts / 10) - Math.floor(oldStationPts / 10);
      
      if (steps > 0) {
        newStationIdx = Math.min(stationCount - 1, newStationIdx + steps);
        const targetStationName = currentMapData.stations[newStationIdx]?.name || `第 ${newStationIdx + 1} 站`;
        advancedNotice = `🎉 ${selectedStudent.name} 前进到了 ${targetStationName}！`;
      }
    }

    const updatedStudent = {
      ...selectedStudent,
      points: newTotal,
      stationPoints: newStationPts,
      stars: newStars,
      currentStationIndex: newStationIdx
    };

    const updatedData = {
      ...data,
      students: data.students.map(s => s.id === selectedStudent.id ? updatedStudent : s)
    };

    saveData(updatedData);
    setSelectedStudent(updatedStudent);

    // 触发前进广播提示
    if (advancedNotice) {
      setNoticeMessage(advancedNotice);
      setTimeout(() => setNoticeMessage(""), 4000);
    }

    // 触发 50 分庆祝与切换城市选择弹窗
    if (Math.floor(newTotal / 50) > Math.floor(oldTotal / 50)) {
      setCelebrationStudent(updatedStudent);
    }
  };

  // 庆祝弹窗中选择下一个城市
  const handleSelectNextCity = (cityId) => {
    if (!celebrationStudent) return;

    const updatedData = {
      ...data,
      students: data.students.map(s => {
        if (s.id === celebrationStudent.id) {
          return { ...s, currentMap: cityId, currentStationIndex: 0, stationPoints: 0 };
        }
        return s;
      })
    };

    saveData(updatedData);
    setCelebrationStudent(null);
    if (selectedStudent?.id === celebrationStudent.id) {
      setSelectedStudent(prev => ({ ...prev, currentMap: cityId, currentStationIndex: 0, stationPoints: 0 }));
    }
  };

  // 专属头像框更换
  const handleSelectFrame = (frameUrl) => {
    if (!selectedStudent) return;

    const updatedData = {
      ...data,
      students: data.students.map(s => {
        if (s.id === selectedStudent.id) {
          return { ...s, frameImage: frameUrl, avatarFrame: frameUrl };
        }
        return s;
      })
    };

    saveData(updatedData);
    setSelectedStudent(prev => ({ ...prev, frameImage: frameUrl, avatarFrame: frameUrl }));
  };

  // 成就解锁 Toggle
  const handleToggleAchievement = (achId) => {
    if (!selectedStudent) return;

    const currentUnlocked = selectedStudent.unlockedAchievements || [];
    const isUnlocked = currentUnlocked.includes(achId);
    const newUnlocked = isUnlocked
      ? currentUnlocked.filter(id => id !== achId)
      : [...currentUnlocked, achId];

    const updatedData = {
      ...data,
      students: data.students.map(s => {
        if (s.id === selectedStudent.id) {
          return { ...s, unlockedAchievements: newUnlocked };
        }
        return s;
      })
    };

    saveData(updatedData);
    setSelectedStudent(prev => ({ ...prev, unlockedAchievements: newUnlocked }));
  };

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden select-none relative">
      
      {/* 顶部前进提示动画挂件 */}
      {noticeMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-black px-6 py-3 rounded-full shadow-2xl border-2 border-white animate-bounce text-lg">
          {noticeMessage}
        </div>
      )}

      {/* 主地图画布 */}
      <div className="flex-1 flex flex-col relative bg-slate-800 overflow-hidden">
        
        {/* 顶部标题与导航 */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-auto">
          <div className="bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-700 shadow-xl">
            <h1 className="text-2xl font-black text-amber-400 tracking-wider">{data.settings?.title || "中国之旅"}</h1>
            <p className="text-xs text-slate-300 font-semibold">{data.settings?.subtitle || "Journey to China"}</p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md p-2 rounded-2xl border border-slate-700 shadow-xl">
            <button 
              onClick={() => setActiveMapId('main')} 
              className={`px-4 py-2 rounded-xl font-bold text-sm transition ${activeMapId === 'main' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
            >
              冒险主页
            </button>
            {data.subMaps?.map(m => (
              <button 
                key={m.id} 
                onClick={() => setActiveMapId(m.id)} 
                className={`px-4 py-2 rounded-xl font-bold text-sm transition ${activeMapId === m.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
              >
                {m.name}
              </button>
            ))}
            <button 
              onClick={() => router.push('/admin')} 
              className="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-white shadow ml-2" 
              title="进入后台"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 地图背景、深灰色细实线与站点 */}
        <div className="flex-1 relative w-full h-full overflow-hidden">
          {currentMapData?.bgImage ? (
            <img src={currentMapData.bgImage} className="w-full h-full object-cover select-none pointer-events-none" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">请在后台上传地图背景</div>
          )}

          {/* 深灰色细实线连线 (宽度1.25，颜色 #475569) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
            {currentMapData?.stations?.map((s, i) => {
              if (i === 0) return null;
              const prev = currentMapData.stations[i - 1];
              const type = s.lineType || 'straight';
              let d = `M ${prev.x} ${prev.y} L ${s.x} ${s.y}`;
              if (type === 'arc') {
                const cx = (prev.x + s.x) / 2 + (s.y - prev.y) * 0.2;
                const cy = (prev.y + s.y) / 2 - (s.x - prev.x) * 0.2;
                d = `M ${prev.x} ${prev.y} Q ${cx} ${cy} ${s.x} ${s.y}`;
              } else if (type === 'curve') {
                const cx1 = prev.x + (s.x - prev.x) * 0.5;
                const cy1 = prev.y;
                const cx2 = prev.x + (s.x - prev.x) * 0.5;
                const cy2 = s.y;
                d = `M ${prev.x} ${prev.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${s.x} ${s.y}`;
              }
              return <path key={`path-${i}`} d={d} fill="none" stroke="#475569" strokeWidth="1.25" />;
            })}
          </svg>

          {/* 地图站点与无外橙框的学生头像 */}
          {currentMapData?.stations?.map((s, i) => {
            let studentsAtStation = [];

            if (activeMapId === 'main') {
              if (s.targetSubMap) {
                studentsAtStation = (data.students || []).filter(stu => (stu.currentMap || 'main') === s.targetSubMap);
              }
            } else {
              studentsAtStation = (data.students || []).filter(stu => {
                const stuMap = stu.currentMap || 'main';
                const stuIdx = stu.currentStationIndex || 0;
                return stuMap === activeMapId && stuIdx === i;
              });
            }

            return (
              <div 
                key={s.id} 
                className="absolute z-20 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
                onClick={() => {
                  if (activeMapId === 'main' && s.targetSubMap) {
                    setActiveMapId(s.targetSubMap);
                  }
                }}
              >
                {/* 学生小头像（移除了橙色外部边框） */}
                {studentsAtStation.length > 0 && (
                  <div className="flex items-center -space-x-2 mb-1.5 z-30">
                    {studentsAtStation.map((stu) => {
                      const frameToUse = stu.frameImage || DEFAULT_BLUE_FRAME;
                      return (
                        <div 
                          key={stu.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectStudent(stu);
                          }}
                          className="w-10 h-10 rounded-full bg-slate-900 relative shadow-xl overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-150 hover:z-40"
                          title={`${stu.name}`}
                        >
                          {stu.avatarImage ? (
                            <img src={stu.avatarImage} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span className="text-sm flex items-center justify-center h-full">{stu.avatar}</span>
                          )}
                          <img src={frameToUse} className="absolute inset-0 w-full h-full object-cover scale-110 pointer-events-none" />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 站点序号圆点 */}
                <div className="w-8 h-8 bg-amber-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-slate-950 font-black text-sm transition hover:scale-110">
                  {i + 1}
                </div>
                <span className="mt-1 px-2 py-0.5 bg-slate-900/90 text-amber-300 font-bold text-xs rounded shadow border border-slate-700 whitespace-nowrap">
                  {s.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 侧边栏 */}
      <div className="w-80 bg-slate-950 border-l border-slate-800 p-4 flex flex-col overflow-y-auto">
        <h2 className="text-lg font-black text-amber-400 mb-3 flex items-center justify-between">
          <span>学生榜单 ({filteredStudents.length}人)</span>
        </h2>

        {activeMapId !== 'main' && (
          <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button 
              onClick={() => setSidebarTab('current')}
              className={`py-1.5 text-xs font-bold rounded-lg transition ${sidebarTab === 'current' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              当前地图学生
            </button>
            <button 
              onClick={() => setSidebarTab('all')}
              className={`py-1.5 text-xs font-bold rounded-lg transition ${sidebarTab === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              全部学生
            </button>
          </div>
        )}

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {filteredStudents.map((stu) => {
            const frameToUse = stu.frameImage || DEFAULT_BLUE_FRAME;
            const displayScore = (stu.stationPoints || 0) % 10;

            return (
              <div 
                key={stu.id} 
                onClick={() => handleSelectStudent(stu)}
                className="bg-slate-900 hover:bg-slate-800 p-3 rounded-2xl border border-slate-800 flex items-center justify-between cursor-pointer transition shadow hover:border-amber-500/50"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full relative bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-700">
                    {stu.avatarImage ? (
                      <img src={stu.avatarImage} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-xl">{stu.avatar}</span>
                    )}
                    <img src={frameToUse} className="absolute inset-0 w-full h-full object-cover scale-110 pointer-events-none" />
                  </div>

                  <div>
                    <div className="font-bold text-white text-base">{stu.name}</div>
                    <div className="text-xs text-amber-400 font-bold flex items-center space-x-1">
                      <span>⭐ x{stu.stars || 0}</span>
                    </div>
                  </div>
                </div>

                {activeMapId !== 'main' && (
                  <div className="text-right">
                    <span className="text-xl font-black text-amber-400">{displayScore}</span>
                    <span className="text-[10px] text-slate-400 block">进度分</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 50分庆祝与选择下一个城市弹窗 */}
      {celebrationStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-6 animate-pulse">
            <div className="text-5xl">🎉 🥳 🎓</div>
            <h2 className="text-3xl font-black text-amber-400">恭喜 {celebrationStudent.name}！</h2>
            <p className="text-slate-200 text-sm font-semibold">
              已累计获得 <span className="text-amber-400 font-bold text-lg">{celebrationStudent.points}</span> 分！解锁了全新阶段，请选择下一个前往探索的城市：
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {data.subMaps?.map(map => (
                <button
                  key={map.id}
                  onClick={() => handleSelectNextCity(map.id)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black p-3 rounded-2xl shadow transition transform hover:scale-105 flex items-center justify-center"
                >
                  <MapPin className="w-4 h-4 mr-1" /> {map.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 前台加分与专属换框弹窗 */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="flex flex-col md:flex-row items-stretch gap-4 max-w-5xl w-full max-h-[85vh] relative">

            <button 
              onClick={() => setSelectedStudent(null)}
              className="absolute -top-12 right-0 text-slate-400 hover:text-white bg-slate-800/80 p-2 rounded-full border border-slate-700"
            >
              <X className="w-6 h-6" />
            </button>

            {/* 左侧加分面板 */}
            <div className="w-full md:w-80 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-2xl relative">
              <div className="flex flex-col items-center">
                
                <div 
                  onClick={() => setShowFramePicker(!showFramePicker)}
                  className="w-24 h-24 rounded-full relative bg-slate-800 flex items-center justify-center cursor-pointer border-2 border-amber-400 shadow-xl transition hover:scale-105"
                  title="点击切换头像框面板"
                >
                  {selectedStudent.avatarImage ? (
                    <img src={selectedStudent.avatarImage} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-4xl">{selectedStudent.avatar}</span>
                  )}
                  <img src={selectedStudent.frameImage || DEFAULT_BLUE_FRAME} className="absolute inset-0 w-full h-full object-cover scale-110 pointer-events-none" />
                  <span className="absolute -bottom-2 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow">
                    换框
                  </span>
                </div>

                <h3 className="text-2xl font-black text-white mt-3">{selectedStudent.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="bg-amber-500/20 text-amber-300 font-bold px-3 py-1 rounded-md text-sm border border-amber-500/30">
                    ⭐ x{selectedStudent.stars || 0}
                  </span>
                </div>

                {/* 专属头像框选择器 */}
                {showFramePicker && (
                  <div className="mt-4 w-full bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <div className="text-xs font-bold text-slate-400 mb-2 text-center">专属头像框列表 (点击即更换)</div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      <button 
                        onClick={() => handleSelectFrame(DEFAULT_BLUE_FRAME)}
                        className={`w-10 h-10 rounded-full border relative shrink-0 overflow-hidden ${selectedStudent.frameImage === DEFAULT_BLUE_FRAME ? 'border-amber-400 scale-105' : 'border-slate-700'}`}
                      >
                        <img src={DEFAULT_BLUE_FRAME} className="w-full h-full object-cover" />
                      </button>
                      {(selectedStudent.frameImages || []).map((frame, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => handleSelectFrame(frame)}
                          className={`w-10 h-10 rounded-full relative cursor-pointer shrink-0 border-2 transition ${selectedStudent.frameImage === frame ? 'border-amber-400 scale-105' : 'border-slate-700 hover:border-slate-500'}`}
                        >
                          <img src={frame} className="w-full h-full object-cover rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 加分操作区 */}
              <div className="mt-6 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleUpdatePoints(1)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-lg shadow">+1 分</button>
                  <button onClick={() => handleUpdatePoints(2)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-lg shadow">+2 分</button>
                  <button onClick={() => handleUpdatePoints(5)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-lg shadow">+5 分</button>
                  <button onClick={() => handleUpdatePoints(10)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-lg shadow">+10 分</button>
                </div>

                <div className="flex items-center space-x-2">
                  <input 
                    type="number" 
                    placeholder="自定义分数" 
                    value={customPointsInput}
                    onChange={e => setCustomPointsInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-white text-center focus:outline-none focus:border-amber-500"
                  />
                  <button 
                    onClick={() => {
                      const val = parseInt(customPointsInput);
                      if (!isNaN(val)) {
                        handleUpdatePoints(val);
                        setCustomPointsInput("");
                      }
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-sm shadow"
                  >
                    确认
                  </button>
                </div>
              </div>
            </div>

            {/* 右侧成就面板 */}
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col shadow-2xl overflow-hidden min-w-[320px]">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                <h3 className="text-xl font-black text-amber-400 flex items-center">
                  <Award className="w-6 h-6 mr-2 text-amber-400" /> 个人成就展示 (点击解锁)
                </h3>
                <span className="text-xs text-slate-400 font-bold">
                  已解锁 {(selectedStudent.unlockedAchievements || []).length} / {achievementsList.length}
                </span>
              </div>

              {achievementsList.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 font-bold">
                  暂无成就卡片，请前往后台【全班成就系统】中创建。
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {achievementsList.map((ach) => {
                    const isUnlocked = (selectedStudent.unlockedAchievements || []).includes(ach.id);
                    return (
                      <div 
                        key={ach.id}
                        onClick={() => handleToggleAchievement(ach.id)}
                        className={`h-24 rounded-2xl p-3 relative overflow-hidden cursor-pointer border-2 transition-all flex flex-col justify-end ${
                          isUnlocked 
                            ? 'border-amber-400 shadow-lg shadow-amber-500/10 scale-[1.02]' 
                            : 'border-slate-800 opacity-60 grayscale hover:opacity-80'
                        }`}
                      >
                        {ach.bgImage ? (
                          <img src={ach.bgImage} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-slate-800" />
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

                        <div className="absolute top-2 right-2 z-10">
                          {isUnlocked ? (
                            <span className="bg-amber-500 text-slate-950 p-1 rounded-full flex items-center justify-center shadow">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              未解锁
                            </span>
                          )}
                        </div>

                        <div className="relative z-10">
                          <div className="font-black text-amber-300 text-sm">{ach.title}</div>
                          <div className="text-slate-300 text-[11px] line-clamp-1">{ach.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}