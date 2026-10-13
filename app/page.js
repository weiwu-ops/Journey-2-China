"use client";
import { useState, useEffect } from 'react';
import { useStore } from './store';
import { useRouter } from 'next/navigation';
import { Award, Check, Sparkles, X, Plus, Minus, Settings, ChevronRight } from 'lucide-react';

export default function GamePage() {
  const router = useRouter();
  const { data, saveData, fetchData } = useStore();
  const [activeMapId, setActiveMapId] = useState("main");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [customPointsInput, setCustomPointsInput] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  if (!data) return <div className="p-10 text-center text-white text-xl font-bold">加载冒险大地图中...</div>;

  const currentMapData = activeMapId === 'main' ? data.mainMap : data.subMaps.find(m => m.id === activeMapId);
  const achievementsList = data.achievements || [];

  // 选择学生弹窗
  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setShowFramePicker(false);
    setCustomPointsInput("");
  };

  // 快捷/自定义加分并实时提交
  const handleUpdatePoints = async (delta) => {
    if (!selectedStudent) return;
    const newPoints = Math.max(0, (selectedStudent.points || 0) + delta);
    const newStars = Math.floor(newPoints / 50);

    const updatedData = {
      ...data,
      students: data.students.map(s => {
        if (s.id === selectedStudent.id) {
          return { ...s, points: newPoints, stars: newStars };
        }
        return s;
      })
    };

    saveData(updatedData);
    setSelectedStudent(prev => ({ ...prev, points: newPoints, stars: newStars }));
  };

  // 前台更换头像框，即时同步
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

  // 前台 Toggle 切换成就解锁/灰度，即时同步
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
    <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden">
      
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

        {/* 地图背景与站点渲染 */}
        <div className="flex-1 relative w-full h-full overflow-hidden">
          {currentMapData?.bgImage ? (
            <img src={currentMapData.bgImage} className="w-full h-full object-cover select-none pointer-events-none" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">请在后台上传地图背景</div>
          )}

          {/* 站点连线 */}
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
              return <path key={`path-${i}`} d={d} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,4" />;
            })}
          </svg>

          {/* 站点标记 */}
          {currentMapData?.stations?.map((s, i) => (
            <div 
              key={s.id} 
              className="absolute z-20 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition hover:scale-110"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
              onClick={() => {
                if (activeMapId === 'main' && s.targetSubMap) {
                  setActiveMapId(s.targetSubMap);
                }
              }}
            >
              <div className="w-8 h-8 bg-amber-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-slate-950 font-black text-sm">
                {i + 1}
              </div>
              <span className="mt-1 px-2 py-0.5 bg-slate-900/90 text-amber-300 font-bold text-xs rounded shadow border border-slate-700 whitespace-nowrap">
                {s.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧学生侧边栏 */}
      <div className="w-80 bg-slate-950 border-l border-slate-800 p-4 flex flex-col overflow-y-auto">
        <h2 className="text-lg font-black text-amber-400 mb-4 flex items-center justify-between">
          <span>学生榜单 ({data.students?.length || 0}人)</span>
        </h2>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {data.students?.map((stu) => (
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
                  {stu.frameImage && (
                    <img src={stu.frameImage} className="absolute inset-0 w-full h-full object-cover scale-110 pointer-events-none" />
                  )}
                </div>

                <div>
                  <div className="font-bold text-white text-base">{stu.name}</div>
                  <div className="text-xs text-amber-400 font-bold flex items-center space-x-1">
                    <span>⭐ x{stu.stars || 0}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-black text-amber-400">{stu.points || 0}</span>
                <span className="text-[10px] text-slate-400 block">分</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 前台交互弹窗（加分面板 + 并列成就框） */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="flex flex-col md:flex-row items-stretch gap-4 max-w-5xl w-full max-h-[85vh] relative">

            {/* 关闭按钮 */}
            <button 
              onClick={() => setSelectedStudent(null)}
              className="absolute -top-12 right-0 text-slate-400 hover:text-white bg-slate-800/80 p-2 rounded-full border border-slate-700"
            >
              <X className="w-6 h-6" />
            </button>

            {/* 左侧：加分与头像框选择面板 */}
            <div className="w-full md:w-80 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-2xl relative">
              <div className="flex flex-col items-center">
                
                {/* 可点击学生头像展关头像框面板 */}
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
                  {selectedStudent.frameImage && (
                    <img src={selectedStudent.frameImage} className="absolute inset-0 w-full h-full object-cover scale-110 pointer-events-none" />
                  )}
                  <span className="absolute -bottom-2 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow">
                    换框
                  </span>
                </div>

                <h3 className="text-2xl font-black text-white mt-3">{selectedStudent.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-2xl font-black text-amber-400">{selectedStudent.points || 0} 分</span>
                  <span className="bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-md text-xs border border-amber-500/30">
                    ⭐ x{selectedStudent.stars || 0}
                  </span>
                </div>

                {/* 前台学生专属头像框选择器 */}
                {showFramePicker && (
                  <div className="mt-4 w-full bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <div className="text-xs font-bold text-slate-400 mb-2 text-center">专属头像框列表 (点击即更换)</div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      <button 
                        onClick={() => handleSelectFrame("")}
                        className={`w-10 h-10 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${!selectedStudent.frameImage ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-slate-700 bg-slate-900 text-slate-400'}`}
                      >
                        无框
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

              {/* 快捷加分按钮 */}
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

            {/* 右侧：成就系统面板（并列相同高度、响应式滚动） */}
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
                  暂无成就卡片，请前往后台【成就管理】中创建。
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
                        {/* 背景图 */}
                        {ach.bgImage ? (
                          <img src={ach.bgImage} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-slate-800" />
                        )}

                        {/* 黑色遮罩保证文字可读 */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

                        {/* 解锁标志 */}
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

                        {/* 文字内容 */}
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