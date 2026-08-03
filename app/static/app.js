const API = '/api';
const CALORIE_TARGET = 2200;
const PROTEIN_TARGET = 150;
const GOAL_WEIGHT = 80;

let chartWeight = null;
let chartNutrition = null;
let state = { weight: [], nutrition: [], workouts: [] };

// ---------- helpers ----------

function today() {
  return new Date().toLocaleDateString('sv-SE');
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (isError ? ' error' : '');
  setTimeout(() => { el.className = ''; }, 2200);
}

function weekAvg(arr, idx, windowSize = 7) {
  const slice = arr.slice(Math.max(0, idx - windowSize + 1), idx + 1);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

// ---------- load & render ----------

async function loadAll() {
  const [weight, nutrition, workouts] = await Promise.all([
    api('/weight'), api('/nutrition'), api('/workouts'),
  ]);
  state = {
    weight: weight.slice().reverse(),       // ascending by date
    nutrition: nutrition.slice().reverse(),
    workouts,                                // descending (as returned)
  };
  renderStats();
  renderWeightChart();
  renderNutritionChart();
  renderLog(currentTab);
}

function renderStats() {
  const strip = document.getElementById('stats-strip');
  const w = state.weight;
  const latest = w.length ? w[w.length - 1] : null;
  const first = w.length ? w[0] : null;
  let weekChange = null;
  if (w.length >= 8) {
    const avgNow = weekAvg(w.map(x => x.weight_kg), w.length - 1);
    const avgPrev = weekAvg(w.map(x => x.weight_kg), w.length - 8);
    weekChange = avgNow - avgPrev;
  }
  const workoutsWeek = state.workouts.filter(x => {
    const d = new Date(x.workout_date);
    return (Date.now() - d.getTime()) < 7 * 86400e3;
  }).length;

  const fmt = (v, cls = '') => `<span class="value ${cls}">${v}</span>`;
  strip.innerHTML = `
    <div class="stat"><span class="label">Текущий вес</span>${latest ? fmt(latest.weight_kg.toFixed(1) + ' кг') : fmt('—')}</div>
    <div class="stat"><span class="label">Изм. за неделю</span>${weekChange !== null ? fmt((weekChange > 0 ? '+' : '') + weekChange.toFixed(1) + ' кг', weekChange <= 0 ? 'good' : 'bad') : fmt('—')}</div>
    <div class="stat"><span class="label">До цели ${GOAL_WEIGHT} кг</span>${latest ? fmt((latest.weight_kg - GOAL_WEIGHT).toFixed(1) + ' кг') : fmt('—')}</div>
    <div class="stat"><span class="label">Тренировок за 7 дн</span>${fmt(workoutsWeek)}</div>
  `;
  void first;
}

function renderWeightChart() {
  const labels = state.weight.map(x => x.weight_date);
  const values = state.weight.map(x => x.weight_kg);
  const avg = values.map((_, i) => weekAvg(values, i));

  const ctx = document.getElementById('chart-weight');
  if (chartWeight) chartWeight.destroy();
  chartWeight = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Вес',
          data: values,
          borderColor: '#4f8cff',
          backgroundColor: 'rgba(79,140,255,0.12)',
          pointRadius: 3,
          borderWidth: 1.5,
          fill: true,
          tension: 0.25,
        },
        {
          label: 'Среднее 7 дн',
          data: avg,
          borderColor: '#f5c542',
          pointRadius: 0,
          borderWidth: 2.5,
          tension: 0.3,
        },
        {
          label: 'Цель ' + GOAL_WEIGHT,
          data: labels.map(() => GOAL_WEIGHT),
          borderColor: '#3ecf8e',
          borderDash: [6, 6],
          pointRadius: 0,
          borderWidth: 1.5,
        },
      ],
    },
    options: chartOptions('кг'),
  });
}

function renderNutritionChart() {
  const last30 = state.nutrition.slice(-30);
  const labels = last30.map(x => x.nutrition_date);
  const ctx = document.getElementById('chart-nutrition');
  if (chartNutrition) chartNutrition.destroy();
  chartNutrition = new Chart(ctx, {
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Калории',
          data: last30.map(x => x.calories),
          backgroundColor: last30.map(x =>
            x.calories && x.calories <= CALORIE_TARGET ? 'rgba(62,207,142,0.7)' : 'rgba(255,107,107,0.7)'),
          yAxisID: 'y',
          order: 2,
        },
        {
          type: 'line',
          label: 'Цель ' + CALORIE_TARGET,
          data: labels.map(() => CALORIE_TARGET),
          borderColor: '#f5c542',
          borderDash: [6, 6],
          pointRadius: 0,
          borderWidth: 1.5,
          yAxisID: 'y',
          order: 1,
        },
        {
          type: 'line',
          label: 'Белок, г',
          data: last30.map(x => x.protein_g),
          borderColor: '#4f8cff',
          pointRadius: 3,
          borderWidth: 1.5,
          yAxisID: 'y1',
          order: 0,
          tension: 0.25,
        },
      ],
    },
    options: {
      ...chartOptions('ккал'),
      scales: {
        x: { ticks: { color: '#8a90a0', maxTicksLimit: 15 }, grid: { color: '#22262f' } },
        y: { position: 'left', ticks: { color: '#8a90a0' }, grid: { color: '#22262f' }, title: { display: true, text: 'ккал', color: '#8a90a0' } },
        y1: { position: 'right', ticks: { color: '#4f8cff' }, grid: { drawOnChartArea: false }, title: { display: true, text: 'белок, г', color: '#4f8cff' } },
      },
    },
  });
}

function chartOptions(unit) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#e4e6eb', boxWidth: 14 } },
    },
    scales: {
      x: { ticks: { color: '#8a90a0', maxTicksLimit: 20 }, grid: { color: '#22262f' } },
      y: { ticks: { color: '#8a90a0' }, grid: { color: '#22262f' }, title: { display: !!unit, text: unit, color: '#8a90a0' } },
    },
  };
}

// ---------- log table ----------

let currentTab = 'weight';

const TAB_CONFIG = {
  weight: {
    cols: ['Дата', 'Вес, кг', 'Заметка', ''],
    rows: () => state.weight.slice().reverse().map(x => [x.weight_date, x.weight_kg.toFixed(1),
      noteCell(x.notes),
      delBtn(() => removeWeight(x.weight_date))]),
  },
  nutrition: {
    cols: ['Дата', 'Ккал', 'Белок', 'Заметка', ''],
    rows: () => state.nutrition.slice().reverse().map(x => [x.nutrition_date, x.calories ?? '—', x.protein_g ?? '—',
      noteCell(x.notes),
      delBtn(() => removeNutrition(x.nutrition_date))]),
  },
  workouts: {
    cols: ['Дата', 'Тип', 'Мин', 'Интенс.', 'Заметка', ''],
    rows: () => state.workouts.map(x => [x.workout_date, typeLabel(x.workout_type), x.duration_min, intensityLabel(x.intensity),
      noteCell(x.notes),
      delBtn(() => removeWorkout(x.id))]),
  },
};

function noteCell(note) {
  if (!note) return '—';
  const span = document.createElement('span');
  span.textContent = note.length > 80 ? note.slice(0, 80) + '…' : note;
  span.title = note;
  return span;
}

const TYPE_LABELS = { gym: 'Зал', boxing: 'Бокс', cardio: 'Кардио', other: 'Другое' };
const INT_LABELS = { low: '↓', medium: '→', high: '↑' };
function typeLabel(t) { return TYPE_LABELS[t] || t; }
function intensityLabel(i) { return i ? (INT_LABELS[i] || i) : '—'; }

function delBtn(onclick) {
  const btn = document.createElement('button');
  btn.className = 'del';
  btn.textContent = '×';
  btn.title = 'Удалить';
  btn.onclick = onclick;
  return btn;
}

function renderLog(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const cfg = TAB_CONFIG[tab];
  const table = document.getElementById('log-table');
  table.querySelector('thead').innerHTML = '<tr>' + cfg.cols.map(c => `<th>${c}</th>`).join('') + '</tr>';
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  const rows = cfg.rows().slice(0, 30);
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${cfg.cols.length}" style="color:var(--text-dim);text-align:center;padding:20px">Пусто</td></tr>`;
    return;
  }
  rows.forEach(cells => {
    const tr = document.createElement('tr');
    cells.forEach(c => {
      const td = document.createElement('td');
      if (c instanceof HTMLElement) td.appendChild(c);
      else td.textContent = c;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// ---------- mutations ----------

async function removeWeight(d) { await api(`/weight/${d}`, { method: 'DELETE' }); toast('Удалено'); loadAll(); }
async function removeNutrition(d) { await api(`/nutrition/${d}`, { method: 'DELETE' }); toast('Удалено'); loadAll(); }
async function removeWorkout(id) { await api(`/workouts/${id}`, { method: 'DELETE' }); toast('Удалено'); loadAll(); }

// ---------- forms ----------

document.getElementById('form-weight').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    await api('/weight', {
      method: 'PUT',
      body: JSON.stringify({
        weight_date: f.weight_date.value,
        weight_kg: parseFloat(f.weight_kg.value),
      }),
    });
    toast('Вес сохранён');
    f.weight_kg.value = '';
    loadAll();
  } catch (err) { toast(err.message, true); }
});

document.getElementById('form-nutrition').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    await api('/nutrition', {
      method: 'PUT',
      body: JSON.stringify({
        nutrition_date: f.nutrition_date.value,
        calories: f.calories.value ? parseInt(f.calories.value) : null,
        protein_g: f.protein_g.value ? parseInt(f.protein_g.value) : null,
      }),
    });
    toast('Питание сохранено');
    f.calories.value = '';
    f.protein_g.value = '';
    loadAll();
  } catch (err) { toast(err.message, true); }
});

document.getElementById('form-workout').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    await api('/workouts', {
      method: 'POST',
      body: JSON.stringify({
        workout_date: f.workout_date.value,
        workout_type: f.workout_type.value,
        duration_min: parseInt(f.duration_min.value),
        intensity: f.intensity.value || null,
      }),
    });
    toast('Тренировка добавлена');
    f.duration_min.value = '';
    loadAll();
  } catch (err) { toast(err.message, true); }
});

document.querySelectorAll('.tab').forEach(b => {
  b.addEventListener('click', () => renderLog(b.dataset.tab));
});

// ---------- init ----------

document.querySelectorAll('input[type="date"]').forEach(i => { i.value = today(); });
loadAll().catch(err => toast(err.message, true));
