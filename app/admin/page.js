"use client";
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useRouter } from 'next/navigation';
import { Map as MapIcon, Users, Settings, Plus, X, Upload, Save, ArrowLeft, Trash2, Type, RotateCcw, Award } from 'lucide-react';

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

const AvatarWithStars = ({ student, sizeClass = "w-10 h-10" }) => {
  const frameToUse = student.frameImage || DEFAULT_BLUE_FRAME;
  const stars = getStarPositions(student.stars || 0);
  return (
    <div className={`${sizeClass} rounded-full bg-slate-900 relative flex items-center justify-center shrink-0`}>
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

export default function AdminPage() {
  const router = useRouter();
  const { data, saveData, fetchData } = useStore();
  const [draft, setDraft] = useState(null);
  const [tab, setTab] = useState("maps"); 
  const [activeMapId, setActiveMapId] = useState("main");
  
  const mapRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const lastMapAddRef = useRef(0); 

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (data) {
      const copy = JSON.parse(JSON.stringify(data));
      if (!copy.achievements) copy.achievements = [];
      setDraft(copy);
    }
  }, [data]);

  if (!draft) return <div className="p-10 text-white">加载中...</div>;

  const handleSaveAll = async () => {
    await saveData(draft);
    alert("保存成功！已完美同步至云端！");
  };

  const uploadImage = (e, type, index = null) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // 核心修复：极限压缩成就图片至 300px，突破 8 个保存限制
        const maxDim = (type === 'mainMap' || type === 'subMap') ? 1200 : (type === 'achievementBg' ? 300 : 400);

        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; } 
          else { width = Math.round((width * maxDim) / height); height = maxDim; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = (type === 'studentFrame') ? 'image/png' : 'image/jpeg';
        const quality = type === 'achievementBg' ? 0.6 : 0.85; // 进一步降低成就图片体积
        const compressedBase64 = canvas.toDataURL(mimeType, quality);

        setDraft(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          if (type === 'mainMap') next.mainMap.bgImage = compressedBase64;
          else if (type === 'subMap') { const m = next.subMaps.find(x => x.id === activeMapId); if(m) m.bgImage = compressedBase64; }
          else if (type === 'studentAvatar') { next.students[index].avatarImage = compressedBase64; next.students[index].avatar = compressedBase64; }
          else if (type === 'studentFrame') {
            next.students[index].frameImage = compressedBase64; next.students[index].avatarFrame = compressedBase64;
            if (!next.students[index].frameImages) next.students[index].frameImages = [];
            if (!next.students[index].frameImages.includes(compressedBase64)) next.students[index].frameImages.push(compressedBase64);
          } else if (type === 'achievementBg') {
            if (!next.achievements) next.achievements = [];
            if (next.achievements[index]) next.achievements[index].bgImage = compressedBase64;
          }
          return next;
        });
      };
    };
    reader.readAsDataURL(file);
  };

  const handlePointerDown = (e, stationId) => { e.stopPropagation(); setDraggingId(stationId); };
  const handlePointerMove = (e) => {
    if (!draggingId || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setDraft(prev => {
      const next = { ...prev };
      const map = activeMapId === 'main' ? next.mainMap : next.subMaps.find(m => m.id === activeMapId);
      const station = map.stations.find(s => s.id === draggingId);
      if (station) { station.x = x; station.y = y; }
      return next;
    });
  };
  const handlePointerUp = () => setDraggingId(null);

  const handleAddStationBtn = () => {
    setDraft(prev => {
      const next = { ...prev };
      const map = activeMapId === 'main' ? next.mainMap : next.subMaps.find(m => m.id === activeMapId);
      const newId = `st_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      map.stations.push({ id: newId, name: "新站点", x: 50, y: 50, targetSubMap: "", lineType: "straight" });
      return next;
    });
  };

  const handleDeleteStationBtn = (stationId) => {
    if (!confirm('确定删除该站点吗？')) return;
    setDraft(prev => {
      const next = { ...prev };
      const map = activeMapId === 'main' ? next.mainMap : next.subMaps.find(m => m.id === activeMapId);
      map.stations = map.stations.filter(s => s.id !== stationId);
      return next;
    });
  };

  const handleAddNewMap = (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastMapAddRef.current < 600) return;
    lastMapAddRef.current = now;
    const name = prompt("请输入城市名称（例如: 北京、上海、西安）:");
    if (!name) return;
    const id = `city_${Date.now()}`;
    setDraft(p => ({ ...p, subMaps: [...p.subMaps, { id, name, bgImage: "", stations: [] }] }));
    setActiveMapId(id);
  };

  const handleDeleteCurrentMap = () => {
    if (activeMapId === 'main') { alert('主地图不能删除！'); return; }
    const mapName = draft.subMaps.find(m => m.id === activeMapId)?.name;
    if (!confirm(`确定要删除城市【${mapName}】吗？`)) return;
    setDraft(prev => { const next = { ...prev }; next.subMaps = next.subMaps.filter(m => m.id !== activeMapId); return next; });
    setActiveMapId('main');
  };

  const handleResetAllScores = () => {
    if (!confirm("⚠️ 警告：确定要重置【全班所有学生】的总分数、星星等进度吗？此操作不可撤销！")) return;
    setDraft(prev => {
      const next = { ...prev };
      next.students = next.students.map(s => ({ ...s, points: 0, stationPoints: 0, stars: 0, currentStationIndex: 0 }));
      return next;
    });
    alert("已成功清空全班分数与星星！请记得点击保存。");
  };

  const handleStudentPointChange = (index, newPointsStr) => {
    const pts = parseInt(newPointsStr) || 0;
    const calculatedStars = Math.floor(pts / 50);
    setDraft(prev => {
      const next = { ...prev };
      next.students[index].points = pts; next.students[index].stars = calculatedStars;
      return next;
    });
  };

  const activeMapData = activeMapId === 'main' ? draft.mainMap : draft.subMaps.find(m => m.id === activeMapId);

  return (
    <div className="flex h-screen bg-gray-100 font-sans" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 font-bold text-xl border-b border-gray-700 flex items-center"><Settings className="mr-2" /> 后台管理系统</div>
        <button onClick={() => setTab('maps')} className={`p-4 text-left flex items-center ${tab === 'maps' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}><MapIcon className="w-5 h-5 mr-3"/> 地图与路线</button>
        <button onClick={() => setTab('students')} className={`p-4 text-left flex items-center ${tab === 'students' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}><Users className="w-5 h-5 mr-3"/> 学生名单与头像</button>
        <button onClick={() => setTab('achievements')} className={`p-4 text-left flex items-center ${tab === 'achievements' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}><Award className="w-5 h-5 mr-3"/> 全班成就系统</button>
        <button onClick={() => setTab('settings')} className={`p-4 text-left flex items-center ${tab === 'settings' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}><Type className="w-5 h-5 mr-3"/> 标题文案设置</button>
        <div className="mt-auto p-4 space-y-3">
          <button onClick={handleSaveAll} className="w-full bg-green-500 hover:bg-green-600 text-white p-3 rounded-xl flex items-center justify-center font-bold shadow-lg"><Save className="w-5 h-5 mr-2"/> 保存所有更改</button>
          <button onClick={() => router.push('/')} className="w-full bg-gray-700 hover:bg-gray-600 p-3 rounded-xl flex items-center justify-center"><ArrowLeft className="w-5 h-5 mr-2"/> 返回游戏前台</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {tab === 'maps' && (
          <div className="flex h-full">
            <div className="flex-1 p-6 flex flex-col relative bg-gray-200 overflow-hidden">
              <div className="mb-4 flex justify-between items-center bg-white p-4 rounded-xl shadow">
                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                  <button onClick={() => setActiveMapId('main')} className={`px-4 py-2 rounded-lg font-bold ${activeMapId === 'main' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>冒险主页</button>
                  {draft.subMaps.map(m => (
                    <button key={m.id} onClick={() => setActiveMapId(m.id)} className={`px-4 py-2 rounded-lg font-bold ${activeMapId === m.id ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{m.name}</button>
                  ))}
                  <button onClick={handleAddNewMap} className="px-3 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 flex items-center shadow"><Plus className="w-4 h-4 mr-1" /> 新城市地图</button>
                </div>
                <label className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg cursor-pointer font-bold flex items-center shadow shrink-0">
                  <Upload className="w-4 h-4 mr-2"/> 上传当前地图背景图
                  <input type="file" accept="image/*" className="hidden" onChange={e => uploadImage(e, activeMapId === 'main' ? 'mainMap' : 'subMap')} />
                </label>
              </div>
              <div ref={mapRef} className="flex-1 relative bg-black rounded-2xl shadow-inner overflow-hidden border-4 border-dashed border-gray-400 select-none">
                {activeMapData?.bgImage ? <img src={activeMapData.bgImage} className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" /> : <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-lg">请在右侧面板点击“+ 加站点”来添加站点</div>}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {activeMapData?.stations.map((s, i) => {
                    if (i === 0) return null;
                    const prev = activeMapData.stations[i-1];
                    const type = s.lineType || 'straight';
                    let d = `M ${prev.x} ${prev.y} L ${s.x} ${s.y}`;
                    if (type === 'arc') d = `M ${prev.x} ${prev.y} Q ${(prev.x + s.x)/2 + (s.y - prev.y)*0.2} ${(prev.y + s.y)/2 - (s.x - prev.x)*0.2} ${s.x} ${s.y}`;
                    else if (type === 'curve') d = `M ${prev.x} ${prev.y} C ${prev.x + (s.x - prev.x)*0.5} ${prev.y}, ${prev.x + (s.x - prev.x)*0.5} ${s.y}, ${s.x} ${s.y}`;
                    return <path key={`line-${s.id}-${i}`} d={d} fill="none" stroke="white" strokeWidth="2.5" strokeDasharray="5,5" />
                  })}
                </svg>
                {activeMapData?.stations.map((s, i) => (
                  <div key={`station-${s.id}-${i}`} onPointerDown={(e) => handlePointerDown(e, s.id)} className="absolute z-20 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                    <div className="w-7 h-7 bg-red-500 border-3 border-white rounded-full shadow-xl flex items-center justify-center text-white text-xs font-black">{i+1}</div>
                    <span className="mt-1 px-2 py-0.5 bg-white/90 text-sm font-bold rounded shadow whitespace-nowrap pointer-events-none">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-96 bg-white border-l p-6 overflow-y-auto flex flex-col">
              <div className="flex justify-between items-center mb-4 pb-3 border-b">
                <div>
                  <h3 className="font-black text-xl text-gray-900">{activeMapId === 'main' ? '主地图站点管理' : `${activeMapData?.name} 站点`}</h3>
                  <p className="text-xs text-gray-500">共 {activeMapData?.stations.length || 0} 个站点</p>
                </div>
                <div className="flex items-center space-x-2">
                  {activeMapId !== 'main' && (
                    <button onClick={handleDeleteCurrentMap} className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center"><X className="w-4 h-4 mr-0.5" /> 删地图</button>
                  )}
                  <button onClick={handleAddStationBtn} className="bg-green-500 hover:bg-green-600 text-white px-3.5 py-1.5 rounded-xl font-bold text-sm flex items-center"><Plus className="w-4 h-4 mr-1" /> 加站点</button>
                </div>
              </div>
              <div className="flex-1 space-y-4">
                {activeMapData?.stations.map((s, i) => (
                  <div key={`edit-${s.id}-${i}`} className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-200 relative shadow-sm">
                    <button onClick={() => handleDeleteStationBtn(s.id)} className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold shadow"><X className="w-4 h-4" /></button>
                    <div className="text-xs font-bold text-gray-400 mb-1">第 {i+1} 站</div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">站点名称：</label>
                    <input type="text" value={s.name} onChange={e => setDraft(p => { const m = activeMapId === 'main' ? p.mainMap : p.subMaps.find(x => x.id === activeMapId); m.stations[i].name = e.target.value; return {...p}; })} className="w-full border-2 p-2 rounded-xl text-sm mb-2 font-bold bg-white" />
                    {i > 0 && (
                      <div className="mb-2">
                        <label className="block text-xs font-bold text-gray-600 mb-1">连线样式 (与上一站之间)：</label>
                        <select value={s.lineType || 'straight'} onChange={e => setDraft(p => { const m = activeMapId === 'main' ? p.mainMap : p.subMaps.find(x => x.id === activeMapId); m.stations[i].lineType = e.target.value; return {...p}; })} className="w-full border-2 p-1.5 rounded-xl text-xs bg-white font-semibold">
                          <option value="straight">直线 (Straight)</option><option value="arc">弧线 (Arc)</option><option value="curve">S型曲线 (Curve)</option>
                        </select>
                      </div>
                    )}
                    {activeMapId === 'main' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">点击后跳转的城市地图：</label>
                        <select value={s.targetSubMap || ''} onChange={e => setDraft(p => { p.mainMap.stations[i].targetSubMap = e.target.value; return {...p}; })} className="w-full border-2 p-2 rounded-xl text-sm bg-white font-semibold">
                          <option value="">(无绑定城市)</option>
                          {draft.subMaps.map(m => <option key={m.id} value={m.id}>绑定: {m.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'students' && (
          <div className="p-8 overflow-y-auto h-full bg-gray-50">
            <div className="flex justify-between items-center mb-6">
              <div><h2 className="text-2xl font-bold">学生名单与总分管理</h2></div>
              <div className="flex items-center space-x-3">
                <button onClick={handleResetAllScores} className="bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center shadow-sm"><RotateCcw className="w-4 h-4 mr-1.5" /> 一键重置全班分数</button>
                <button onClick={() => setDraft(p => { if(p.students.length >= 30) { alert('已达上限 30 人'); return p; } return {...p, students: [...p.students, { id: `stu_${Date.now()}`, name: "新学生", avatar: "🤖", avatarImage: "", frameImage: "", frameImages: [], color: "#3b82f6", points: 0, stationPoints: 0, currentMap: "main", currentStationIndex: 0, stars: 0, unlockedAchievements: [] }]}; })} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center hover:bg-blue-700 shadow"><Plus className="w-5 h-5 mr-1" /> 添加学生</button>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-100 border-b text-gray-700 text-sm">
                  <tr><th className="p-4">预览/照片</th><th className="p-4">姓名</th><th className="p-4">目前获得的总分数</th><th className="p-4">设置总分数</th><th className="p-4">更换照片 / 备用Emoji</th><th className="p-4">上传头像框</th><th className="p-4">起始城市</th><th className="p-4">操作</th></tr>
                </thead>
                <tbody>
                  {draft.students.map((student, i) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50 items-center">
                      <td className="p-4"><AvatarWithStars student={student} sizeClass="w-12 h-12" /></td>
                      <td className="p-4"><input type="text" className="border rounded-lg p-2 font-bold w-24 text-sm" value={student.name} onChange={e => setDraft(p => { p.students[i].name = e.target.value; return {...p}; })}/></td>
                      <td className="p-4"><div className="flex items-center space-x-2"><span className="text-xl font-black text-blue-600">{student.points || 0}</span><span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">⭐x{student.stars || 0}</span></div></td>
                      <td className="p-4"><input type="number" className="border-2 rounded-lg p-1.5 w-24 text-center font-bold text-gray-800 bg-gray-50 focus:bg-white" value={student.points || 0} onChange={e => handleStudentPointChange(i, e.target.value)} /></td>
                      <td className="p-4 space-y-2">
                        <div className="flex items-center space-x-2">
                          <label className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-lg text-sm cursor-pointer font-bold">上传照片<input type="file" accept="image/*" className="hidden" onChange={e => uploadImage(e, 'studentAvatar', i)} /></label>
                          {student.avatarImage && <button onClick={() => setDraft(p => { p.students[i].avatarImage=""; p.students[i].avatar=""; return {...p}; })} className="text-red-500 text-xs underline">清除</button>}
                        </div>
                        <input type="text" className="border w-20 text-center rounded p-1 text-sm" value={student.avatar} onChange={e => setDraft(p => { p.students[i].avatar = e.target.value; return {...p}; })} placeholder="备用Emoji"/>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <label className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded-lg text-sm cursor-pointer font-bold">上传头像框<input type="file" accept="image/*" className="hidden" onChange={e => uploadImage(e, 'studentFrame', i)} /></label>
                          {student.frameImage && <button onClick={() => setDraft(p => { p.students[i].frameImage=""; p.students[i].avatarFrame=""; return {...p}; })} className="text-red-500 text-xs underline">移除框</button>}
                        </div>
                      </td>
                      <td className="p-4">
                        <select className="border rounded-lg p-2 text-sm" value={student.currentMap} onChange={e => setDraft(p => { p.students[i].currentMap = e.target.value; p.students[i].currentStationIndex = 0; return {...p}; })}>
                          <option value="main">主地图</option>
                          {draft.subMaps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </td>
                      <td className="p-4"><button onClick={() => { if(confirm(`确定删除 ${student.name} 吗？`)) setDraft(p => ({...p, students: p.students.filter(s => s.id !== student.id)})); }} className="text-red-500 hover:bg-red-100 p-2 rounded-lg"><Trash2 className="w-5 h-5"/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'achievements' && (
          <div className="p-8 overflow-y-auto h-full bg-gray-50">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center"><Award className="mr-2 text-yellow-600"/> 全班成就卡片管理</h2>
                <p className="text-xs text-gray-500 mt-1">提示：已极限优化压缩算法，不再有保存数量限制。</p>
              </div>
              <button onClick={() => setDraft(p => ({ ...p, achievements: [...(p.achievements || []), { id: `ach_${Date.now()}`, title: "新成就名称", description: "描述内容...", bgImage: "" }] }))} className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow"><Plus className="w-5 h-5 mr-1" /> 新增成就</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(draft.achievements || []).map((ach, index) => (
                <div key={ach.id} className="bg-white p-5 rounded-2xl shadow border flex gap-4 relative">
                  <button onClick={() => { if(confirm("确定删除该成就吗？")) setDraft(p => ({ ...p, achievements: (p.achievements || []).filter(a => a.id !== ach.id) })); }} className="absolute top-3 right-3 text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 className="w-5 h-5" /></button>
                  <div className="w-36 h-28 bg-gray-100 rounded-xl overflow-hidden relative flex flex-col items-center justify-center border shrink-0">
                    {ach.bgImage ? <img src={ach.bgImage} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400 font-bold text-center px-2">无背景图</span>}
                    <label className="absolute bottom-1 right-1 bg-black/60 hover:bg-black text-white text-[10px] px-2 py-0.5 rounded cursor-pointer font-bold">换图<input type="file" accept="image/*" className="hidden" onChange={e => uploadImage(e, 'achievementBg', index)} /></label>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div><label className="block text-xs font-bold text-gray-500 mb-1">成就名称：</label><input type="text" value={ach.title} onChange={e => setDraft(p => { const next = { ...p }; next.achievements[index].title = e.target.value; return next; })} className="w-full border p-2 rounded-lg font-bold text-sm" /></div>
                    <div><label className="block text-xs font-bold text-gray-500 mb-1">成就描述：</label><input type="text" value={ach.description} onChange={e => setDraft(p => { const next = { ...p }; next.achievements[index].description = e.target.value; return next; })} className="w-full border p-2 rounded-lg text-xs" /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="p-10 max-w-xl bg-white m-8 rounded-3xl shadow-xl border space-y-6">
            <h2 className="text-2xl font-bold flex items-center"><Type className="mr-2 text-blue-600"/> 网页标题与副标题设置</h2>
            <div><label className="block font-bold text-gray-700 mb-2">主页大标题：</label><input type="text" value={draft.settings.title || ""} onChange={e => setDraft(p => ({...p, settings: {...p.settings, title: e.target.value}}))} className="w-full border-2 p-3 rounded-xl text-lg font-bold" /></div>
            <div><label className="block font-bold text-gray-700 mb-2">主页副标题：</label><input type="text" value={draft.settings.subtitle || ""} onChange={e => setDraft(p => ({...p, settings: {...p.settings, subtitle: e.target.value}}))} className="w-full border-2 p-3 rounded-xl text-base" /></div>
          </div>
        )}
      </div>
    </div>
  );
}