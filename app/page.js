"use client";
import { useEffect, useState, useRef } from 'react';
import { useStore } from './store';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Settings, Users, ArrowLeft, X, Star, Maximize, Minimize } from 'lucide-react';

export default function GamePage() {
  const router = useRouter();
  const { data, fetchData, currentViewMapId, setViewMap, classAddOne, addPoints, celebrationMsg, mapCompletedStudent, completeMapSelection, closeCelebration } = useStore();
  const [loading, setLoading] = useState(true);
  const [activeScorePanel, setActiveScorePanel] = useState(null); 
  const [customPoint, setCustomPoint] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("city"); 
  const mapContainerRef = useRef(null);

  useEffect(() => {
    fetchData().then(() => setLoading(false));
  }, [fetchData]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().catch(err => alert(`全屏失败: ${err.message}`));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const exitFullscreenSafe = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (loading || !data) return <div className="flex h-screen items-center justify-center bg-amber-50 text-black font-bold">加载冒险地图中...</div>;

  const currentMapData = currentViewMapId === 'main' ? data.mainMap : data.subMaps.find(m => m.id === currentViewMapId);
  const visibleStudents = data.students.filter(student => currentViewMapId === 'main' || student.currentMap === currentViewMapId);

  const handleCustomPointSubmit = (e) => {
    e.preventDefault();
    const pt = parseInt(customPoint);
    if (!isNaN(pt) && activeScorePanel) {
      addPoints(activeScorePanel.id, pt);
    }
    setCustomPoint("");
    setActiveScorePanel(null);
  };

  const getLinePath = (prev, curr, type) => {
    const x1 = prev.x;
    const y1 = prev.y;
    const x2 = curr.x;
    const y2 = curr.y;

    if (type === 'arc') {
      const cx = (x1 + x2) / 2 + (y2 - y1) * 0.2;
      const cy = (y1 + y2) / 2 - (x2 - x1) * 0.2;
      return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
    } else if (type === 'curve') {
      const cx1 = x1 + (x2 - x1) * 0.5;
      const cy1 = y1;
      const cx2 = x1 + (x2 - x1) * 0.5;
      const cy2 = y2;
      return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    } else {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
  };

  const renderArcStars = (starCount) => {
    if (!starCount || starCount <= 0) return null;
    const count = Math.min(starCount, 7);
    const radiusPercent = 48;
    const stars = [];

    for (let i = 0; i < count; i++) {
      const angleDeg = count === 1 ? 90 : 15 + (i * (150 / (count - 1)));
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = 50 + radiusPercent * Math.cos(angleRad);
      const y = 50 + radiusPercent * Math.sin(angleRad);

      stars.push(
        <div 
          key={i} 
          className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-30"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-400 fill-yellow-400 stroke-black stroke-[1.5]" />
        </div>
      );
    }
    return stars;
  };

  const sidebarStudents = currentViewMapId === 'main' 
    ? data.students 
    : (sidebarTab === 'city' ? data.students.filter(s => s.currentMap === currentViewMapId) : data.students);

  return (
    <div className="flex h-screen w-screen bg-amber-50 text-gray-900 overflow-hidden relative select-none">
      
      {/* 顶部公告 Toast 栏 */}
      <AnimatePresence>
        {celebrationMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -40 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -40 }}
            className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 bg-amber-300 text-amber-950 px-6 py-3 rounded-2xl text-xl font-bold shadow-lg border-2 border-black"
          >
            {celebrationMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= 左侧：16:9 比例视口与全屏容器 ================= */}
      <div 
        ref={mapContainerRef}
        className="flex-1 relative bg-black overflow-hidden flex items-center justify-center"
      >
        <div className="relative w-full aspect-video max-w-full max-h-full overflow-hidden bg-amber-100 flex items-center justify-center">
          
          {currentMapData?.bgImage ? (
            <img src={currentMapData.bgImage} alt={currentMapData.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-amber-100" />
          )}

          {/* 顶部导航与全屏按钮 */}
          <div className="absolute top-6 left-6 z-30 flex items-center space-x-4">
            {currentViewMapId !== 'main' && (
              <button 
                onClick={() => { exitFullscreenSafe(); setViewMap('main'); }} 
                className="flex items-center px-4 py-2 bg-white rounded-xl shadow hover:bg-amber-50 font-bold border-2 border-black transition-transform active:translate-x-0.5 active:translate-y-0.5"
              >
                <ArrowLeft className="w-5 h-5 mr-1.5" /> 返回主地图
              </button>
            )}
            <div className="bg-white px-6 py-2 rounded-xl border-2 border-black shadow text-black">
              <h1 className="text-2xl font-black tracking-wider">{currentViewMapId === 'main' ? (data.settings?.title || "课堂积分冒险") : currentMapData?.name}</h1>
              {currentViewMapId === 'main' && data.settings?.subtitle && (
                <p className="text-xs font-semibold text-gray-600 mt-0.5">{data.settings.subtitle}</p>
              )}
            </div>

            <button 
              onClick={toggleFullscreen}
              className="p-2.5 bg-white rounded-xl border-2 border-black shadow hover:bg-amber-50 font-bold flex items-center"
              title={isFullscreen ? "退出全屏" : "全屏显示"}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>

          {/* SVG 连线 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <filter id="line-shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.6" />
              </filter>
            </defs>
            {currentMapData?.stations.map((station, index) => {
              if (index === 0) return null;
              const prev = currentMapData.stations[index - 1];
              const pathData = getLinePath(prev, station, station.lineType || 'straight');
              const isMain = currentViewMapId === 'main';
              return (
                <path 
                  key={`line-${station.id}-${index}`} 
                  d={pathData}
                  fill="none"
                  stroke="#ffffff" 
                  strokeWidth="1.2" 
                  strokeDasharray={isMain ? "2,2" : "none"} 
                  strokeLinecap="round"
                  filter="url(#line-shadow)"
                />
              );
            })}
          </svg>

          {/* 站点与学生 Avatar */}
          {currentMapData?.stations.map((station, index) => {
            const isMain = currentViewMapId === 'main';
            const totalStations = currentMapData?.stations.length;
            const isLastStation = !isMain && (index === totalStations - 1);
            const studentsHere = visibleStudents.filter(s => isMain ? s.currentMap === station.targetSubMap : s.currentStationIndex === index);

            return (
              <div key={`station-node-${station.id}-${index}`} className="absolute z-30 flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${station.x}%`, top: `${station.y}%` }}>
                
                <div className="relative flex items-center justify-center">
                  <button 
                    onClick={() => { if (isMain && station.targetSubMap) setViewMap(station.targetSubMap); }}
                    className={`w-7 h-7 rounded-full border-2 border-black shadow transition-transform hover:scale-125 ${isMain ? 'bg-amber-400 cursor-pointer' : 'bg-red-500'}`}
                  />
                  {isLastStation && (
                    <div className="absolute -top-6 text-xl animate-bounce pointer-events-none drop-shadow">
                      🏁
                    </div>
                  )}
                </div>
                
                <span className="mt-1.5 px-2.5 py-0.5 bg-white text-black text-sm font-bold rounded-lg border-2 border-black shadow-sm whitespace-nowrap">
                  {station.name}
                </span>

                <div className="absolute top-12 flex flex-wrap w-48 justify-center pointer-events-auto">
                  {studentsHere.map((student, sIdx) => {
                    return (
                      <div key={student.id} className="relative flex flex-col items-center -ml-1.5 mb-2 group">
                        <motion.div 
                          layoutId={`student-${student.id}`} 
                          className={`
                            rounded-full border-2 border-black shadow-md flex items-center justify-center cursor-pointer relative bg-white transition-all duration-300
                            ${isMain ? 'w-8 h-8 group-hover:w-16 group-hover:h-16 group-hover:z-50' : 'w-16 h-16'}
                          `}
                          style={{ backgroundColor: student.color, zIndex: 10 + sIdx }}
                          onClick={() => setActiveScorePanel(student)}
                        >
                          <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                            {student.avatarImage ? (
                              <img src={student.avatarImage} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className={isMain ? "text-xs group-hover:text-2xl" : "text-2xl"}>{student.avatar}</span>
                            )}
                          </div>

                          {student.frameImage && (
                            <img src={student.frameImage} alt="头像框" className="absolute inset-0 w-full h-full object-cover pointer-events-none z-20 scale-110" />
                          )}

                          {renderArcStars(student.stars)}
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= 加分面板 Modal ================= */}
      <AnimatePresence>
        {activeScorePanel && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 p-6 w-80 border-2 border-black"
          >
            <button onClick={() => setActiveScorePanel(null)} className="absolute top-3 right-3 bg-red-400 w-7 h-7 rounded-full border-2 border-black flex items-center justify-center font-bold hover:bg-red-500"><X className="w-4 h-4" /></button>
            
            <div className="text-center mb-5">
              <div className="w-20 h-20 mx-auto rounded-full border-2 border-black overflow-hidden shadow flex items-center justify-center bg-gray-100 mb-2 relative">
                {activeScorePanel.avatarImage ? <img src={activeScorePanel.avatarImage} className="w-full h-full object-cover" /> : <span className="text-3xl">{activeScorePanel.avatar}</span>}
                {activeScorePanel.frameImage && <img src={activeScorePanel.frameImage} className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-110" />}
              </div>
              <h3 className="text-xl font-bold">{activeScorePanel.name}</h3>
              
              {/* 子地图只显示每 10 分归零重置的关卡进度分 */}
              <p className="text-orange-600 font-bold text-xs mt-2 bg-orange-50 border border-orange-200 py-1 px-3 rounded-lg inline-block">
                本站进度: <span className="text-sm font-black text-blue-600">{activeScorePanel.stationPoints || 0}</span> / 10 分
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1, 2, 3, 5, 10].map(pt => (
                <button key={pt} onClick={() => { addPoints(activeScorePanel.id, pt); setActiveScorePanel(null); }} className="bg-amber-200 hover:bg-amber-300 border-2 border-black py-2 rounded-xl font-bold text-base shadow-sm">+{pt}</button>
              ))}
            </div>
            
            <form onSubmit={handleCustomPointSubmit} className="flex space-x-2">
              <input type="number" placeholder="自定义分值" className="flex-1 border-2 border-black p-2 rounded-xl text-center text-sm font-semibold bg-gray-50 focus:outline-none" value={customPoint} onChange={e => setCustomPoint(e.target.value)} />
              <button type="submit" className="bg-black text-white px-4 py-2 rounded-xl font-bold border-2 border-black">确认</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= 地图通关 Modal ================= */}
      <AnimatePresence>
        {mapCompletedStudent && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-6 max-w-md w-full text-center shadow-2xl border-4 border-black relative">
              <button onClick={() => { exitFullscreenSafe(); closeCelebration(); }} className="absolute top-3 right-3 bg-red-400 w-7 h-7 rounded-full border-2 border-black flex items-center justify-center font-bold">
                <X className="w-4 h-4" />
              </button>
              <div className="text-5xl mb-3">🌟🎉🌟</div>
              <h2 className="text-2xl font-black mb-1 text-red-600">完美通关！</h2>
              <p className="text-lg mb-3 font-bold">{mapCompletedStudent.name} 到达终点！</p>
              <p className="text-gray-600 mb-4 text-sm font-semibold">请为该学生选择下一张地图：</p>
              
              <div className="grid grid-cols-2 gap-3">
                {data.subMaps.map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => { exitFullscreenSafe(); completeMapSelection(mapCompletedStudent.id, m.id); }}
                    disabled={m.id === mapCompletedStudent.currentMap}
                    className={`p-3 rounded-xl font-bold text-sm border-2 border-black ${m.id === mapCompletedStudent.currentMap ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-yellow-200 hover:bg-yellow-300'}`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= 右侧：学生积分榜边栏 ================= */}
      <div className="w-80 bg-white shadow-xl flex flex-col z-30 border-l-2 border-black">
        
        <div className="border-b-2 border-black bg-amber-100 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <button onClick={classAddOne} className="flex items-center px-3.5 py-2 bg-green-400 text-black border-2 border-black rounded-xl font-bold hover:bg-green-500 shadow-sm text-sm">
              <Users className="w-4 h-4 mr-1.5" /> 全班 +1
            </button>
            <button onClick={() => router.push('/admin')} className="p-2 bg-white text-black border-2 border-black hover:bg-gray-100 rounded-xl shadow-sm">
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {currentViewMapId !== 'main' && (
            <div className="flex bg-white p-1 rounded-xl border-2 border-black">
              <button 
                onClick={() => setSidebarTab('city')} 
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${sidebarTab === 'city' ? 'bg-amber-300 border border-black shadow-sm' : 'text-gray-500'}`}
              >
                当前城市
              </button>
              <button 
                onClick={() => setSidebarTab('all')} 
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${sidebarTab === 'all' ? 'bg-amber-300 border border-black shadow-sm' : 'text-gray-500'}`}
              >
                全部同学
              </button>
            </div>
          )}
        </div>
        
        {/* 学生列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sidebarStudents.map(student => {
            const subMap = data.subMaps.find(m => m.id === student.currentMap);
            const stationName = subMap ? subMap.stations[student.currentStationIndex]?.name : '未知';
            const isMainView = currentViewMapId === 'main';

            return (
              <div 
                key={student.id} 
                onClick={() => setActiveScorePanel(student)} 
                className="bg-white border-2 border-black rounded-2xl p-3 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-full border-2 border-black overflow-hidden flex items-center justify-center bg-gray-100 relative shrink-0">
                    {student.avatarImage ? <img src={student.avatarImage} className="w-full h-full object-cover rounded-full" /> : <span className="text-lg">{student.avatar}</span>}
                    {student.frameImage && <img src={student.frameImage} className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-110" />}
                  </div>
                  <div>
                    <div className="font-bold text-base">{student.name}</div>
                    <div className="text-xs text-blue-600 font-semibold">{subMap?.name} - {stationName}</div>
                  </div>
                </div>

                <div className="text-right">
                  {(isMainView || sidebarTab === 'all') ? (
                    <div className="font-black text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-300">
                      ⭐x{student.stars || 0}
                    </div>
                  ) : (
                    <div>
                      {/* 子地图关卡进度分：每 10 分归零重置 */}
                      <div className="font-black text-lg text-blue-600">{student.stationPoints || 0}</div>
                      <div className="text-[10px] text-gray-400">/ 10 分</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}