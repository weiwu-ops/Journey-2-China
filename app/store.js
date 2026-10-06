import { create } from 'zustand';

export const useStore = create((set, get) => ({
  data: null,
  currentViewMapId: 'main',
  celebrationMsg: null,
  mapCompletedStudent: null,

  // 安全获取后台数据（带 HTTP 状态校验与 JSON 异常捕获）
  fetchData: async () => {
    try {
      const res = await fetch('/api/store');
      if (!res.ok) {
        console.error(`请求失败，服务器返回状态码: ${res.status}`);
        return;
      }
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        set({ data: json });
      } catch (jsonErr) {
        console.error('API 返回的不是有效 JSON 数据，请检查后端 /api/store/route.js 返回值。内容为:', text);
      }
    } catch (e) {
      console.error('获取数据发生网络错误:', e);
    }
  },

  // 安全保存数据到后台
  saveData: async (newData) => {
    set({ data: newData });
    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      if (!res.ok) {
        console.error('保存数据到后台失败，状态码:', res.status);
      }
    } catch (e) {
      console.error('保存数据时发生错误:', e);
    }
  },

  setViewMap: (mapId) => {
    set({ currentViewMapId: mapId });
  },

  // 给单个学生加分/减分逻辑（同步更新后台总分与关卡分）
  addPoints: (studentId, pointsToAdd) => {
    const { data, saveData } = get();
    if (!data) return;

    const nextData = JSON.parse(JSON.stringify(data));
    const student = nextData.students.find(s => s.id === studentId);
    if (!student) return;

    // 1. 累加全局总分数，并自动核算星星 (每 50 分 = 1 颗星)
    student.points = Math.max(0, (student.points || 0) + pointsToAdd);
    student.stars = Math.floor(student.points / 50);

    // 2. 更新关卡进度分 (每 10 分满额进一站，并重置归零)
    let currentStationPts = (student.stationPoints || 0) + pointsToAdd;

    if (currentStationPts >= 10) {
      const currentMapObj = nextData.subMaps.find(m => m.id === student.currentMap);
      const totalStations = currentMapObj ? currentMapObj.stations.length : 0;

      // 满 10 分关卡进度归零，并在地图上前进一步
      student.stationPoints = currentStationPts % 10;
      student.currentStationIndex = (student.currentStationIndex || 0) + 1;

      // 如果到达终点站，触发通关弹窗
      if (totalStations > 0 && student.currentStationIndex >= totalStations - 1) {
        student.currentStationIndex = totalStations - 1;
        set({ mapCompletedStudent: student });
      } else {
        const nextStationName = currentMapObj?.stations[student.currentStationIndex]?.name || '下一站';
        set({ celebrationMsg: `🎉 ${student.name} 前进了！到达【${nextStationName}】` });
        setTimeout(() => set({ celebrationMsg: null }), 3000);
      }
    } else {
      student.stationPoints = Math.max(0, currentStationPts);
    }

    saveData(nextData);
  },

  // 全班所有人 +1 分
  classAddOne: () => {
    const { data, addPoints } = get();
    if (!data) return;
    data.students.forEach(s => addPoints(s.id, 1));
  },

  // 通关时选择降落地图
  completeMapSelection: (studentId, targetMapId) => {
    const { data, saveData } = get();
    if (!data) return;

    const nextData = JSON.parse(JSON.stringify(data));
    const student = nextData.students.find(s => s.id === studentId);
    if (student) {
      student.currentMap = targetMapId;
      student.currentStationIndex = 0;
      student.stationPoints = 0;
    }

    set({ mapCompletedStudent: null, currentViewMapId: targetMapId });
    saveData(nextData);
  },

  closeCelebration: () => set({ mapCompletedStudent: null })
}));