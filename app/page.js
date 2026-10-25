"use client";
import { useState, useEffect } from 'react';
import { useStore } from './store';
import { useRouter } from 'next/navigation';
import { Award, Check, Settings, MapPin, X } from 'lucide-react';

const DEFAULT_BLUE_FRAME = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='46' fill='none' stroke='%231d4ed8' stroke-width='8'/></svg>";

const getStarPositions = (count) => {
  const maxStars = Math.min(count, 7);
  const positions = [];
  const radius = 58; 
  const angles = [90, 135, 45, 165, 15, 190, -10];
  for (let i = 0; i < maxStars; i++) {
    const angleRad = (angles[i] * Math.PI) / 180;
    positions.push({ x: Math.cos(angleRad) * radius, y: Math.sin(angleRad) * radius, isNewest: i === maxStars - 1 });
  }
  return positions;
};

const AvatarWithStars = ({ student, sizeClass = "w-10 h-10", isHoverable = false }) => {
  const frameToUse = student.frameImage || DEFAULT_BLUE_FRAME;
  const stars = getStarPositions(student.stars || 0);
  
  return (
    <div className={`${sizeClass} rounded-full bg-slate-900 relative flex items-center justify-center shrink-0 ${isHoverable ? 'cursor-pointer transition-transform duration-200 hover:scale-125 hover:z-40 shadow-xl' : ''}`}>
      {student.avatarImage ? (
        <img src={student.avatarImage} className="w-[85%] h-[85%] object-cover rounded-full z-10" />
      ) : (
        <span className="text-xl z-10">{student.avatar}</span>
      )}
      <img src={frameToUse} className="absolute inset-0 w-full h-full object-cover scale-[1.15] z-20 pointer-events-none" />
      
      {stars.map((pos, idx) => (
        <div key={idx} className={`absolute z-30 flex items-center justify-center drop-shadow-md ${pos.isNewest ? 'animate-pulse scale-125' : ''}`} style={{ transform: `translate(${pos.x}%, ${pos.y}%)`, width: '16px', height: '16px' }}>
          <span className="text-[12px] leading-none">⭐</span>
        </div>
      ))}
    </div>
  );
};

export default function GamePage() {
  const router = useRouter();
  const { data, saveData, fetchData } = useStore();
  const [activeMapId, setActiveMapId] = useState("main");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [customPointsInput, setCustomPointsInput] = useState("");
  const [sidebarTab, setSidebarTab] = useState("current"); 

  const [celebrationStudent, setCelebrationStudent] = useState(null);
  const [toasts, setToasts] = useState([]); 
  
  // 10分动画：新增 mapData，用于锁定学生所在真实地图
  const [miniMapAnim, setMiniMapAnim] = useState({ show: false, mapData: null, oldIdx: 0, newIdx: 0, showConfetti: false });
  // 50分飞行跨越动画
  const [flightAnim, setFlightAnim] = useState({ show: false, student: null, fromX: 50, fromY: 50, toX: 50, toY: 50, moving: false });

  useEffect(() => { fetchData(); }, []);

  if (!data) return <div className="p-10 text-center text-white text-xl font-bold">加载冒险大地图中...</div>;

  const currentMapData = activeMapId === 'main' ? data.mainMap : data.subMaps?.find(m => m.id === activeMapId);
  const achievementsList = data.achievements || [];

  const filteredStudents = (data.students || []).filter(stu => {
    if (activeMapId === 'main' || sidebarTab === 'all') return true;
    return (stu.currentMap || 'main') === activeMapId;
  });

  const addToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setShowFramePicker(false);
    setCustomPointsInput("");
  };

  const handleUpdatePoints = async (delta) => {
    if (!selectedStudent) return;
    const oldTotal = selectedStudent.points || 0;
    const oldStationPts = selectedStudent.stationPoints || 0;
    const newTotal = Math.max(0, oldTotal + delta);
    const newStationPts = Math.max(0, oldStationPts + delta);
    const newStars = Math.floor(newTotal / 50);

    let newStationIdx = selectedStudent.currentStationIndex || 0;
    let oldStationIdx = newStationIdx;
    
    // 【修改点1】判断学生当前真正所在的地图，而不是教师当前浏览的地图
    const stuMapId = selectedStudent.currentMap || 'main';
    const stuMapData = stuMapId === 'main' ? data.mainMap : data.subMaps?.find(m => m.id === stuMapId);
    
    if (stuMapData?.stations?.length) {
      const stationCount = stuMapData.stations.length;
      const steps = Math.floor(newStationPts / 10) - Math.floor(oldStationPts / 10);
      
      if (steps > 0) {
        newStationIdx = Math.min(stationCount - 1, newStationIdx + steps);
        setMiniMapAnim({ show: true, mapData: stuMapData, oldIdx: oldStationIdx, newIdx: newStationIdx, showConfetti: false });
        
        setTimeout(() => {
          setMiniMapAnim(p => ({ ...p, showConfetti: true }));
          addToast(`🎉 ${selectedStudent.name} 前进到了 ${stuMapData.stations[newStationIdx]?.name || '下一站'}！`);
        }, 1500);

        setTimeout(() => {
          setMiniMapAnim({ show: false, mapData: null, oldIdx: 0, newIdx: 0, showConfetti: false });
        }, 4000);
      }
    }

    addToast(`Congratulations！${selectedStudent.name} +${delta}分`);

    const updatedStudent = { ...selectedStudent, points: newTotal, stationPoints: newStationPts, stars: newStars, currentStationIndex: newStationIdx };
    saveData({ ...data, students: data.students.map(s => s.id === selectedStudent.id ? updatedStudent : s) });
    setSelectedStudent(updatedStudent);

    if (Math.floor(newTotal / 50) > Math.floor(oldTotal / 50)) {
      setCelebrationStudent(updatedStudent);
    }
  };

  // 【修改点2】选择新城市后，触发飞机航线移动动画
  const handleSelectNextCity = (cityId) => {
    if (!celebrationStudent) return;
    
    const fromCityId = celebrationStudent.currentMap || 'main';
    const fromStation = data.mainMap?.stations?.find(s => s.targetSubMap === fromCityId) || data.mainMap?.stations?.[0] || { x: 50, y: 50 };
    const toStation = data.mainMap?.stations?.find(s => s.targetSubMap === cityId) || { x: 50, y: 50 };

    setFlightAnim({ show: true, student: celebrationStudent, fromX: fromStation.x, fromY: fromStation.y, toX: toStation.x, toY: toStation.y, moving: false });

    // 存储数据
    saveData({ ...data, students: data.students.map(s => s.id === celebrationStudent.id ? { ...s, currentMap: cityId, currentStationIndex: 0, stationPoints: 0 } : s) });
    setCelebrationStudent(null);
    
    if (selectedStudent?.id === celebrationStudent.id) {
      setSelectedStudent(prev => ({ ...prev, currentMap: cityId, currentStationIndex: 0, stationPoints: 0 }));
    }

    // 稍微延迟以触发CSS过渡动画
    setTimeout(() => {
      setFlightAnim(prev => ({ ...prev, moving: true }));
    }, 100);

    // 3秒后自动关闭飞行弹窗
    setTimeout(() => {
      setFlightAnim(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleSelectFrame = (frameUrl) => {
    if (!selectedStudent) return;
    saveData({ ...data, students: data.students.map(s => s.id === selectedStudent.id ? { ...s, frameImage: frameUrl, avatarFrame: frameUrl } : s) });
    setSelectedStudent(prev => ({ ...prev, frameImage: frameUrl, avatarFrame: frameUrl }));
  };

  const handleToggleAchievement = (ach) => {
    if (!selectedStudent) return;
    const currentUnlocked = selectedStudent.unlockedAchievements || [];
    const isUnlocked = currentUnlocked.includes(ach.id);
    const newUnlocked = isUnlocked ? currentUnlocked.filter(id => id !== ach.id) : [...currentUnlocked, ach.id];

    if (!isUnlocked) addToast(`Congratulations！获得成就 ${ach.title}`);

    saveData({ ...data, students: data.students.map(s => s.id === selectedStudent.id ? { ...s, unlockedAchievements: newUnlocked } : s) });
    setSelectedStudent(prev => ({ ...prev, unlockedAchievements: newUnlocked }));
  };

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden select-none relative">
      
      {toasts.map((t) => (
        <div key={t.id} onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="fixed top-12 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 pointer-events-auto bg-amber-500 text-slate-950 font-black px-6 py-3 rounded-full shadow-2xl border-2 border-white text-lg animate-bounce cursor-pointer transition hover:scale-105">
          {t.msg}
        </div>
      ))}

      <div className="flex-1 flex flex-col relative bg-slate-800 overflow-hidden">
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-auto">
          <div className="bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-700 shadow-xl">
            <h1 className="text-2xl font-black text-amber-400 tracking-wider">{data.settings?.title || "中国之旅"}</h1>
            <p className="text-xs text-slate-300 font-semibold">{data.settings?.subtitle || "Journey to China"}</p>
          </div>
          <div className="flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md p-2 rounded-2xl border border-slate-700 shadow-xl">
            <button onClick={() => setActiveMapId('main')} className={`px-4 py-2 rounded-xl font-bold text-sm ${activeMapId === 'main' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-white'}`}>冒险主页</button>
            {data.subMaps?.map(m => (
              <button key={m.id} onClick={() => setActiveMapId(m.id)} className={`px-4 py-2 rounded-xl font-bold text-sm ${activeMapId === m.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-white'}`}>{m.name}</button>
            ))}
            <button onClick={() => router.push('/admin')} className="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-white shadow ml-2"><Settings className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 relative w-full h-full overflow-hidden">
          {currentMapData?.bgImage && <img src={currentMapData.bgImage} className="w-full h-full object-cover select-none pointer-events-none" />}
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
            {currentMapData?.stations?.map((s, i) => {
              if (i === 0) return null;
              const prev = currentMapData.stations[i - 1];
              const type = s.lineType || 'straight';
              let d = `M ${prev.x} ${prev.y} L ${s.x} ${s.y}`;
              if (type === 'arc') d = `M ${prev.x} ${prev.y} Q ${(prev.x + s.x)/2 + (s.y - prev.y)*0.2} ${(prev.y + s.y)/2 - (s.x - prev.x)*0.2} ${s.x} ${s.y}`;
              else if (type === 'curve') d = `M ${prev.x} ${prev.y} C ${prev.x + (s.x - prev.x)*0.5} ${prev.y}, ${prev.x + (s.x - prev.x)*0.5} ${s.y}, ${s.x} ${s.y}`;
              return <path key={`path-${i}`} d={d} fill="none" stroke="#475569" strokeWidth="1.25" />;
            })}
          </svg>

          {currentMapData?.stations?.map((s, i) => {
            const studentsAtStation = (data.students || []).filter(stu => activeMapId === 'main' ? (s.targetSubMap && (stu.currentMap || 'main') === s.targetSubMap) : (stu.currentMap === activeMapId && (stu.currentStationIndex || 0) === i));
            return (
              <div key={s.id} className="absolute z-20 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                {studentsAtStation.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mb-2 z-30" style={{ maxWidth: '220px' }}>
                    {studentsAtStation.map(stu => (
                      <div key={stu.id} onClick={(e) => { e.stopPropagation(); handleSelectStudent(stu); }}>
                        <AvatarWithStars student={stu} sizeClass="w-9 h-9" isHoverable={true} />
                      </div>
                    ))}
                  </div>
                )}
                <div className="w-8 h-8 bg-amber-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-slate-950 font-black text-sm">{i + 1}</div>
                <span className="mt-1 px-2 py-0.5 bg-slate-900/90 text-amber-300 font-bold text-xs rounded shadow border border-slate-700 whitespace-nowrap">{s.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-80 bg-slate-950 border-l border-slate-800 p-4 flex flex-col overflow-y-auto z-40">
        <h2 className="text-lg font-black text-amber-400 mb-3 flex items-center justify-between"><span>学生榜单 ({filteredStudents.length}人)</span></h2>
        {activeMapId !== 'main' && (
          <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button onClick={() => setSidebarTab('current')} className={`py-1.5 text-xs font-bold rounded-lg ${sidebarTab === 'current' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}>当前地图</button>
            <button onClick={() => setSidebarTab('all')} className={`py-1.5 text-xs font-bold rounded-lg ${sidebarTab === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}>全部学生</button>
          </div>
        )}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {filteredStudents.map(stu => (
            <div key={stu.id} onClick={() => handleSelectStudent(stu)} className="bg-slate-900 hover:bg-slate-800 p-3 rounded-2xl border border-slate-800 flex items-center justify-between cursor-pointer">
              <div className="flex items-center space-x-4 ml-2">
                <AvatarWithStars student={stu} sizeClass="w-12 h-12" />
                <div><div className="font-bold text-white text-base">{stu.name}</div></div>
              </div>
              {activeMapId !== 'main' && (
                <div className="text-right"><span className="text-xl font-black text-amber-400">{(stu.stationPoints || 0) % 10}</span><span className="text-[10px] text-slate-400 block">进度分</span></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedStudent(null); }}>
          <div className="flex flex-col md:flex-row items-stretch gap-4 max-w-5xl w-full max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedStudent(null)} className="absolute -top-12 right-0 text-slate-400 hover:text-white bg-slate-800/80 p-2 rounded-full border border-slate-700"><X className="w-6 h-6" /></button>

            {/* 左侧面板 */}
            <div className="w-full md:w-80 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-2xl relative">
              <div className="flex flex-col items-center mt-4">
                <div onClick={() => setShowFramePicker(!showFramePicker)} className="cursor-pointer relative z-10 transition hover:scale-105">
                  <AvatarWithStars student={selectedStudent} sizeClass="w-24 h-24" />
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow z-40">换框</span>
                </div>
                
                <h3 className="text-2xl font-black text-white mt-5">{selectedStudent.name}</h3>
                
                <div className="bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-full mt-2 text-xs font-bold text-slate-300 relative z-10 shadow-inner">
                  {(selectedStudent.currentMap || 'main') === 'main' 
                    ? "选择城市开始冒险" 
                    : `${data.subMaps?.find(m=>m.id===selectedStudent.currentMap)?.name || '未知城市'} - ${data.subMaps?.find(m=>m.id===selectedStudent.currentMap)?.stations?.[selectedStudent.currentStationIndex]?.name || `第${selectedStudent.currentStationIndex+1}站`}`}
                </div>

                {showFramePicker && (
                  <div className="absolute top-48 w-[90%] bg-slate-950 p-4 rounded-2xl border border-slate-700 shadow-2xl z-50">
                    <div className="text-xs font-bold text-slate-400 mb-2 text-center">专属头像框列表 (点击即更换)</div>
                    <div className="flex items-center gap-3 overflow-x-auto pb-2">
                      <button onClick={() => handleSelectFrame(DEFAULT_BLUE_FRAME)} className="w-12 h-12 rounded-full border relative shrink-0"><img src={DEFAULT_BLUE_FRAME} className="w-full h-full object-cover" /></button>
                      {(selectedStudent.frameImages || []).map((frame, idx) => (
                        <div key={idx} onClick={() => handleSelectFrame(frame)} className="w-12 h-12 rounded-full relative cursor-pointer shrink-0 border-2 border-slate-700 hover:border-amber-400"><img src={frame} className="w-full h-full object-cover rounded-full" /></div>
                      ))}
                    </div>
                    <button onClick={() => setShowFramePicker(false)} className="w-full mt-2 bg-slate-800 py-1 rounded text-xs">关闭</button>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3 z-10">
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 5, 10].map(val => (
                    <button key={val} onClick={() => handleUpdatePoints(val)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-lg shadow">+{val} 分</button>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <input type="number" placeholder="自定义分数" value={customPointsInput} onChange={e => setCustomPointsInput(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-white text-center" />
                  <button onClick={() => { const val = parseInt(customPointsInput); if (!isNaN(val)) { handleUpdatePoints(val); setCustomPointsInput(""); } }} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-sm">确认</button>
                </div>
              </div>
            </div>

            {/* 右侧面板 */}
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col shadow-2xl overflow-hidden min-w-[320px] relative">
              
              {!miniMapAnim.show ? (
                <>
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                    <h3 className="text-xl font-black text-amber-400 flex items-center"><Award className="w-6 h-6 mr-2 text-amber-400" /> 个人成就展示</h3>
                    <span className="text-xs text-slate-400 font-bold">已解锁 {(selectedStudent.unlockedAchievements || []).length} / {achievementsList.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {achievementsList.map(ach => {
                      const isUnlocked = (selectedStudent.unlockedAchievements || []).includes(ach.id);
                      return (
                        <div key={ach.id} onClick={() => handleToggleAchievement(ach)} className={`h-24 rounded-2xl p-3 relative overflow-hidden cursor-pointer border-2 transition flex flex-col justify-end ${isUnlocked ? 'border-amber-400 scale-[1.02]' : 'border-slate-800 grayscale opacity-60'}`}>
                          {ach.bgImage && <img src={ach.bgImage} className="absolute inset-0 w-full h-full object-cover" />}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                          <div className="absolute top-2 right-2 z-10">{isUnlocked ? <span className="bg-amber-500 text-slate-950 p-1 rounded-full flex shadow"><Check className="w-3.5 h-3.5" /></span> : <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px]">未解锁</span>}</div>
                          <div className="relative z-10"><div className="font-black text-amber-300 text-sm">{ach.title}</div><div className="text-slate-300 text-[11px] line-clamp-1">{ach.description}</div></div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 z-50 bg-slate-900 cursor-pointer" onClick={() => setMiniMapAnim({ show: false, mapData: null, oldIdx: 0, newIdx: 0, showConfetti: false })}>
                  <div className="w-full h-full relative border-2 border-amber-500 rounded-3xl overflow-hidden">
                    {/* 使用真实学生所在地图的数据渲染 */}
                    <img src={miniMapAnim.mapData?.bgImage} className="w-full h-full object-cover opacity-80" />
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {miniMapAnim.mapData?.stations?.map((s, i) => {
                        if (i === 0) return null;
                        const prev = miniMapAnim.mapData.stations[i - 1];
                        return <path key={i} d={`M ${prev.x} ${prev.y} L ${s.x} ${s.y}`} fill="none" stroke="#475569" strokeWidth="1" />;
                      })}
                    </svg>
                    
                    {miniMapAnim.mapData?.stations?.[miniMapAnim.oldIdx] && (
                      <div className="absolute w-4 h-4 bg-slate-600 rounded-full border border-white transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${miniMapAnim.mapData.stations[miniMapAnim.oldIdx].x}%`, top: `${miniMapAnim.mapData.stations[miniMapAnim.oldIdx].y}%` }} />
                    )}
                    {miniMapAnim.mapData?.stations?.[miniMapAnim.newIdx] && (
                      <div className="absolute w-6 h-6 bg-amber-500 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 shadow-xl animate-pulse" style={{ left: `${miniMapAnim.mapData.stations[miniMapAnim.newIdx].x}%`, top: `${miniMapAnim.mapData.stations[miniMapAnim.newIdx].y}%` }} />
                    )}

                    <div className="absolute z-40 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-[1500ms] ease-in-out" style={{ left: `${miniMapAnim.mapData?.stations?.[miniMapAnim.showConfetti ? miniMapAnim.newIdx : miniMapAnim.oldIdx]?.x || 50}%`, top: `${miniMapAnim.mapData?.stations?.[miniMapAnim.showConfetti ? miniMapAnim.newIdx : miniMapAnim.oldIdx]?.y || 50}%` }}>
                      <AvatarWithStars student={selectedStudent} sizeClass="w-16 h-16" />
                    </div>

                    {miniMapAnim.showConfetti && (
                      <div className="absolute z-50 text-5xl animate-ping" style={{ left: `${miniMapAnim.mapData?.stations?.[miniMapAnim.newIdx]?.x}%`, top: `${miniMapAnim.mapData?.stations?.[miniMapAnim.newIdx]?.y}%` }}>✨🎊</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* 50分奖励：选择下个城市弹窗 */}
      {celebrationStudent && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-pulse">
            <div className="text-5xl">🎉 🥳 🎓</div>
            <h2 className="text-3xl font-black text-amber-400 mt-4">恭喜 {celebrationStudent.name}！</h2>
            <p className="text-slate-200 text-sm font-semibold mt-2 mb-6">已累计获得 <span className="text-amber-400 font-bold text-lg">{celebrationStudent.points}</span> 分！解锁全新阶段，请选择下一个城市：</p>
            <div className="grid grid-cols-2 gap-3">
              {data.subMaps?.map(map => (
                <button key={map.id} onClick={() => handleSelectNextCity(map.id)} className="bg-amber-500 text-slate-950 font-black p-3 rounded-2xl shadow hover:scale-105"><MapPin className="w-4 h-4 inline" /> {map.name}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 新增：跨城市航线飞行特效弹窗 */}
      {flightAnim.show && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setFlightAnim(prev => ({ ...prev, show: false }))}>
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl overflow-hidden w-full max-w-4xl h-[60vh] relative shadow-2xl" onClick={e => e.stopPropagation()}>
            
            <img src={data.mainMap?.bgImage} className="w-full h-full object-cover opacity-80" />
            
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
               {data.mainMap?.stations?.map((s, i) => {
                  if (i === 0) return null;
                  const prev = data.mainMap.stations[i - 1];
                  return <path key={i} d={`M ${prev.x} ${prev.y} L ${s.x} ${s.y}`} fill="none" stroke="#475569" strokeWidth="1" />;
               })}
            </svg>

            {/* 终点站标记 */}
            <div className="absolute w-8 h-8 bg-amber-500 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 shadow-xl animate-pulse flex items-center justify-center" style={{ left: `${flightAnim.toX}%`, top: `${flightAnim.toY}%` }}>
               <MapPin className="w-5 h-5 text-slate-950" />
            </div>

            {/* 飞行中的头像与飞机 */}
            <div className="absolute z-40 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-[2000ms] ease-in-out" style={{ left: `${flightAnim.moving ? flightAnim.toX : flightAnim.fromX}%`, top: `${flightAnim.moving ? flightAnim.toY : flightAnim.fromY}%` }}>
              <div className="relative drop-shadow-2xl">
                <AvatarWithStars student={flightAnim.student} sizeClass="w-16 h-16" />
                <span className="absolute -top-3 -right-3 text-3xl animate-bounce">✈️</span>
              </div>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}