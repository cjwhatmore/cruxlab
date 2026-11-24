'use strict';
const $ = s => document.querySelector(s), esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => localDate(), dateAt = n => {
    let d = new Date();
    d.setDate(d.getDate() + n);
    return localDate(d);
}, fmt = d => new Date(d + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric'
}), uid = () => globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2);
const types = [
    'Limit bouldering', 'Power endurance', 'Aerobic / ARC', 'Finger strength', 'Strength & conditioning', 'Technique', 'Outdoor bouldering', 'Outdoor sport climbing', 'Sport climbing', 'Active recovery', 'Rest', 'Other'
];
const grades = ['VB', ...Array.from({ length: 18 }, (_, i) => 'V' + i), ...['5.6', '5.7', '5.8', '5.9'], ...[
        '10', '11', '12', '13', '14', '15'
    ].flatMap(n => ['a', 'b', 'c', 'd'].map(l => '5.' + n + l))];
const key = 'cruxlab-v1';
const blank = () => ({
    sessions: [], recovery: [], plan: [], goal: '', chat: [], draft: null
});
let state;
try {
    state = JSON.parse(localStorage.getItem(key)) || blank();
}
catch {
    state = blank();
}

function save() {
    try {
        localStorage.setItem(key, JSON.stringify(state));
        return true;
    }
    catch (e) {
        toast('Storage unavailable. Export a backup before closing.');
        return false;
    }
}
let toastTimer;

function toast(t) {
    $('#toast').textContent = t;
    $('#toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2600);
}
const icons = {
    today: '<path d="m3 10 9-7 9 7v11H3z"/><path d="M9 21v-8h6v8"/>', log: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>', plan: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18"/>', stats: '<path d="M3 3v18h18M7 16l4-5 4 2 5-8"/>', coach: '<path d="M20 11a8 8 0 0 1-8 8H4l2-5a8 8 0 1 1 14-3Z"/><path d="M9 11h6"/>'
};
const tabs = [
    'today', 'log', 'plan', 'stats', 'coach'
];
let current = 'today';
const options = (arr, val) => arr.map(v => `<option ${v === val ? 'selected' : ''}>${esc(v)}</option>`).join('');
const empty = t => `<p class="empty">${esc(t)}</p>`;
const byDate = (a, b) => b.date.localeCompare(a.date);
const sessionLoad = s => s.duration * s.rpe;
const recent = (days) => state.sessions.filter(s => s.date >= dateAt(1 - days) && s.date <= today());
const latestRecovery = () => state.recovery.find(r => r.date === today());

function rec() {
    const r = latestRecovery();
    const past = state.sessions.filter(s => s.date <= today());
    const heavy = past.filter(s => s.finger === 'High').sort(byDate)[0];
    const days = heavy ? Math.round((new Date(today() + 'T12:00:00') - new Date(heavy.date + 'T12:00:00')) / 86400000) : null;
    if (r?.pain)
        return {
            title: 'Rest painful fingers', type: 'Rest', detail: 'You reported finger pain. Avoid loading painful fingers; seek clinical advice if significant or persistent.', steps: ['Rest the affected area', 'Gentle movement only if comfortable'], status: 'Pain reported'
        };
    if (!r)
        return {
            title: 'Start with a recovery check-in', type: 'Technique', detail: 'Log sleep, soreness and energy before choosing intensity. Without a check-in, the coach cannot assess your current readiness.', steps: ['Check in', 'Warm up gradually', 'Keep climbing easy if unsure'], status: 'Check-in needed'
        };
    if (r.soreness >= 4 || r.energy <= 2 || r.sleep < 6)
        return {
            title: 'Recovery or rest day', type: 'Active recovery', detail: 'Your check-in suggests fatigue. Keep today easy and reassess tomorrow.', steps: ['20–30 min easy cardio if comfortable', 'Gentle mobility', 'Prioritize sleep and nutrition'], status: 'Recovery priority'
        };
    if (days !== null && days < 3)
        return {
            title: 'Aerobic / technique session', type: 'Aerobic / ARC', detail: `High finger load logged ${days === 0 ? 'today' : days + ' day(s) ago'}. Allow roughly 2–3 days between heavy finger days and adjust based on how you feel.`, steps: ['15 min progressive warm-up', '2 × 15 min easy climbing with rest', 'Easy mobility'], status: 'Finger recovery'
        };
    const focus = [
        'Limit bouldering', 'Power endurance', 'Aerobic / ARC', 'Finger strength', 'Technique'
    ];
    const counts = Object.fromEntries(focus.map(t => [t, recent(14).filter(s => s.type === t).length]));
    let type = focus.sort((a, b) => counts[a] - counts[b])[0];
    const workouts = {
        'Limit bouldering': ['20 min progressive warm-up', '30–40 min short hard attempts with 3–5 min rests', 'Cool down'], 'Power endurance': ['20 min warm-up', '3 controlled climbing intervals with full recovery', 'Cool down'], 'Aerobic / ARC': ['15 min warm-up', '2 × 15 min easy continuous climbing', 'Cool down'], 'Finger strength': ['20 min progressive warm-up', '3–5 controlled hangs, full rest, familiar loading only', 'Cool down'], 'Technique': ['15 min warm-up', '30 min footwork and movement drills', 'Easy cool down']
    };
    return {
        title: type, type, detail: 'Your check-in is favorable, and this training focus is among your least logged over the last 14 days. Verify readiness during your warm-up.', steps: workouts[type], status: 'Check-in favorable'
    };
}

function title(k, t, s) {
    return `<div class="eyebrow">${k}</div>
        <h1>${t}</h1>
        <p class="sub">${s}</p>`;
}

function metric(label, value, note = '') {
    return `<div class="card">
        <small>${label}</small>
        <div class="metric">${value}</div>
        <small>${note}</small>
        </div>`;
}

function todayPage() {
    const r = rec(), w = recent(7), plans = state.plan.filter(p => p.date >= today() && !p.done).sort((a, b) => a.date.localeCompare(b.date));
    return title('Training dashboard', 'Your next move.', 'Train with intent. Recover with purpose.') + `<div class="grid four">${metric('Readiness', `<span class="accent" style="font-size:20px">${esc(r.status)}</span>`, 'Subjective check-in')}${metric('Last 7 days', w.length, 'Sessions logged')}${metric('Climbing & training', Math.round(w.reduce((a, s) => a + s.duration, 0) / 6) / 10 + ' h', 'Last 7 days')}${metric('Session load', w.reduce((a, s) => a + sessionLoad(s), 0), 'Minutes × RPE')}</div>
        <div class="columns">
        <section>
        <div class="card hero">
        <div class="row">
        <span class="eyebrow">✦ Coach recommendation</span>
        <span class="pill">Rules-based</span>
        </div>
        <h2>${esc(r.title)}</h2>
        <p>${esc(r.detail)}</p>
        <div class="divider">
        </div>${r.steps.map(s => `<div class="listrow">${esc(s)}</div>`).join('')}<div class="stack" style="margin-top:16px">
        <button class="primary block" data-act="start" data-type="${esc(r.type)}">Start / log this session</button>
        <button class="outline block" data-act="checkin">${latestRecovery() ? 'Update' : 'Daily'} recovery check-in</button>
        </div>
        </div>${state.draft ? '<div class="card"><h3>Unfinished session</h3><p class="muted">Your draft is saved on this device.</p><a class="button outline block" href="#log">Resume session</a></div>' : ''}</section>
        <section>
        <div class="card">
        <div class="row">
        <h2>Coming up</h2>
        <a class="button smallbtn" href="#plan">Plan</a>
        </div>${plans.length ? plans.slice(0, 3).map(p => `<div class="listrow">
        <small>${fmt(p.date)}</small>
        <h3>${esc(p.type)}</h3>
        <p class="muted">${esc(p.note || '')}</p>
        </div>`).join('') : empty('No upcoming sessions. Build a plan or add an outdoor climbing day.')}</div>
        <div class="card">
        <div class="row">
        <h2>Recent activity</h2>
        <a class="button smallbtn" href="#log">Log</a>
        </div>${state.sessions.length ? state.sessions.slice().sort(byDate).slice(0, 3).map(sessionRow).join('') : empty('Your first session starts here.')}</div>
        </section>
        </div>`;
}
const newDraft = (type = 'Limit bouldering') => ({
    date: today(), type, duration: 60, rpe: 5, finger: 'Moderate', notes: '', climbs: [], tests: [], started: Date.now()
});

function sessionRow(s) {
    return `<div class="listrow">
        <div class="row">
        <div>
        <small>${fmt(s.date)}</small>
        <h3>${esc(s.type)}</h3>
        <p class="muted">${s.duration} min · RPE ${s.rpe} · ${esc(s.finger)} finger load</p>
        </div>
        <button class="smallbtn" data-act="edit" data-id="${esc(s.id)}">Edit</button>
        </div>${s.climbs.length ? `<div class="session-summary">${s.climbs.map(c => `<span>${esc(c.grade)} · ${c.sends}/${c.attempts} sends</span>`).join('')}</div>` : ''}${s.tests.length ? `<div class="session-summary">${s.tests.map(t => `<span>${esc(t.name)}: ${esc(t.value)} ${esc(t.unit)}</span>`).join('')}</div>` : ''}</div>`;
}

function logPage() {
    if (!state.draft) {
        return title('Training journal', 'Log a session', 'Record climbing, training and performance tests.') + `<div class="card hero">
            <h2>Ready to log?</h2>
            <p class="muted">Start a session or record one you already completed.</p>
            <button class="primary block" style="margin-top:16px" data-act="new">+ New session</button>
            </div>
            <div class="card">
            <h2>Session history</h2>${state.sessions.length ? state.sessions.slice().sort(byDate).map(sessionRow).join('') : empty('No sessions yet.')}</div>`;
    }
    const d = state.draft;
    return title('Training journal', d.id ? 'Edit session' : 'Session logger', 'Add as much or as little detail as you need.') + `<div class="columns">
        <section>
        <div class="card">
        <div class="row">
        <h2>Session details</h2>
        <button class="smallbtn" data-act="cancelDraft">Discard draft</button>
        </div>
        <form id="session-form">
        <div class="fields">
        <label>Date<input type="date" name="date" required value="${esc(d.date)}">
        </label>
        <label>Training focus<select name="type">${options(types, d.type)}</select>
        </label>
        <label>Minutes<input type="number" name="duration" min="1" max="1440" required value="${d.duration}">
        </label>
        <label>Session RPE (1–10)<input type="number" name="rpe" min="1" max="10" required value="${d.rpe}">
        </label>
        </div>
        <label>Finger loading<select name="finger">${options(['None', 'Low', 'Moderate', 'High'], d.finger)}</select>
        </label>
        <label>Notes<textarea name="notes" placeholder="Style, projects, how you felt…">${esc(d.notes)}</textarea>
        </label>
        <button class="primary block" type="submit">Save session</button>${d.id ? '<button type="button" class="danger" data-act="delete">Delete saved session</button>' : ''}</form>
        </div>
        </section>
        <section>
        <div class="card">
        <div class="row">
        <h2>Climbs</h2>
        <span class="tag">Sends / attempts</span>
        </div>
        <form id="climb-form">
        <label>Grade<select name="grade">${options(grades, 'V6')}</select>
        </label>
        <div class="fields">
        <label>Sends<input name="sends" type="number" min="0" max="999" value="1" required>
        </label>
        <label>Attempts<input name="attempts" type="number" min="1" max="999" value="1" required>
        </label>
        </div>
        <button class="outline block">+ Add climbs</button>
        </form>${d.climbs.map((c, i) => `<div class="listrow row">
        <div>
        <strong>${esc(c.grade)}</strong>
        <p class="muted">${c.sends} sends / ${c.attempts} attempts</p>
        </div>
        <button class="smallbtn" data-act="removeClimb" data-i="${i}">Remove</button>
        </div>`).join('')}</div>
        <div class="card">
        <h2>Performance / exercise</h2>
        <form id="test-form">
        <label>Exercise / metric<select name="name">${options([
        '20 mm max hang', 'Weighted pull-up', 'Max finger force', 'ARC duration', 'Power endurance moves', 'Bodyweight', 'Other'
    ], '20 mm max hang')}</select>
        </label>
        <div class="fields">
        <label>Value<input name="value" type="number" step="any" required placeholder="45">
        </label>
        <label>Unit<select name="unit">${options([
        'lb added', 'kg added', 'N', 'lb', 'kg', 'seconds', 'minutes', 'moves', 'reps'
    ], 'lb added')}</select>
        </label>
        </div>
        <label>Protocol / sets / reps<input name="protocol" placeholder="7 s, half crimp; 4 × 5…">
        </label>
        <button class="outline block">+ Add measurement</button>
        </form>${d.tests.map((t, i) => `<div class="listrow row">
        <div>
        <strong>${esc(t.name)}</strong>
        <p class="muted">${t.value} ${esc(t.unit)} · ${esc(t.protocol)}</p>
        </div>
        <button class="smallbtn" data-act="removeTest" data-i="${i}">Remove</button>
        </div>`).join('')}</div>
        </section>
        </div>`;
}

function planPage() {
    return title('Training calendar', 'Plan your week', 'Schedule training, climbing and recovery days.') + `<div class="columns">
        <section>
        <div class="card">
        <div class="row">
        <h2>Next 7 days</h2>
        <button class="smallbtn" data-act="suggestPlan">Suggest week</button>
        </div>${Array.from({ length: 7 }, (_, i) => {
        const d = dateAt(i), ps = state.plan.filter(p => p.date === d), ss = state.sessions.filter(s => s.date === d);
        return `<div class="listrow ${i === 0 ? 'todayrow' : ''}">
            <div class="row">
            <span class="day">${fmt(d)}</span>
            <div class="daybody">${ps.length ? ps.map(p => `<div class="row">
            <div>
            <strong>${p.done ? '✓ ' : ''}${esc(p.type)}</strong>
            <p class="muted">${esc(p.note)}</p>
            </div>
            <button class="smallbtn" data-act="editPlan" data-id="${esc(p.id)}">Edit</button>
            </div>`).join('') : '<span class="muted">Unplanned</span>'}${ss.map(s => `<p class="tag">✓ Logged: ${esc(s.type)}</p>`).join('')}</div>
            <button class="smallbtn" data-act="addPlan" data-date="${d}" aria-label="Add plan ${d}">+</button>
            </div>
            </div>`;
    }).join('')}</div>
        </section>
        <section>
        <div class="card">
        <h2>Training goal</h2>
        <form id="goal-form">
        <label>Current focus<textarea name="goal" placeholder="Improve steep route endurance…">${esc(state.goal)}</textarea>
        </label>
        <button class="outline">Save goal</button>
        </form>
        </div>
        <div class="card">
        <h2>Other planned days</h2>${state.plan.filter(p => p.date < today() || p.date > dateAt(6)).sort((a, b) => a.date.localeCompare(b.date)).map(p => `<div class="listrow row">
        <div>
        <small>${fmt(p.date)}</small>
        <h3>${p.done ? '✓ ' : ''}${esc(p.type)}</h3>
        </div>
        <button class="smallbtn" data-act="editPlan" data-id="${esc(p.id)}">Edit</button>
        </div>`).join('') || empty('No other planned days.')}<button class="outline block" data-act="addPlan" data-date="${dateAt(7)}">+ Schedule another day</button>
        </div>
        </section>
        </div>`;
}

function statsPage() {
    let all = state.sessions, last = recent(28), counts = {};
    last.forEach(s => s.climbs.forEach(c => counts[c.grade] = (counts[c.grade] || 0) + c.sends));
    let max = Math.max(1, ...Object.values(counts)), total = Object.values(counts).reduce((a, b) => a + b, 0), b = grades.filter(g => g.startsWith('V') && counts[g] > 0).at(-1), rope = grades.filter(g => g.startsWith('5.') && counts[g] > 0).at(-1);
    let groups = {};
    all.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(s => s.tests.forEach(t => {
        let k = [t.name, t.unit, t.protocol.trim()].join('|');
        (groups[k] ??= []).push({ ...t, date: s.date });
    }));
    let tests = Object.values(groups).map(ts => {
        let min = Math.min(...ts.map(t => t.value)), max = Math.max(...ts.map(t => t.value)), pts = ts.map((t, i) => `${ts.length === 1 ? 150 : 10 + i * 280 / (ts.length - 1)},${85 - (t.value - min) / (max - min || 1) * 65}`).join(' ');
        return `<div class="card">
            <small>${esc(ts[0].name)} · ${esc(ts[0].unit)} ${esc(ts[0].protocol)}</small>
            <div class="metric">${ts.at(-1).value}</div>
            <p class="muted">${ts.length} measurement(s) · ${ts.length > 1 ? `Change: ${(ts.at(-1).value - ts[0].value).toFixed(1)} ${esc(ts[0].unit)}` : 'Log another comparable test to see a trend.'}</p>
            <svg class="chart" viewBox="0 0 300 100" role="img" aria-label="Measurement trend">
            <path d="M10 20H290M10 50H290M10 85H290" stroke="#35443a" fill="none" stroke-dasharray="4 4"/>
            <polyline points="${pts}" fill="none" stroke="#c4e99e" stroke-width="3"/>${pts.split(' ').map(p => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="4" fill="#c4e99e"/>`).join('')}</svg>
            <div class="row">
            <small>${fmt(ts[0].date)}</small>
            <small>${fmt(ts.at(-1).date)}</small>
            </div>
            </div>`;
    }).join('');
    return title('Performance analytics', 'See your progress.', 'Your actual logged data, not simulated scores.') + `<div class="grid four">${metric('28-day sends', total)}${metric('Top boulder', b || '—', '28 days')}${metric('Top route', rope || '—', '28 days')}${metric('28-day load', last.reduce((a, s) => a + sessionLoad(s), 0), 'Minutes × RPE')}</div>
        <div class="columns">
        <section>
        <div class="card">
        <h2>Grade distribution</h2>${grades.filter(g => counts[g] > 0).map(g => `<div class="chartrow">
        <span class="label">${g}</span>
        <div class="bartrack">
        <div class="bar" style="width:${100 * counts[g] / max}%">
        </div>
        </div>
        <span class="count">${counts[g]}</span>
        </div>`).join('') || empty('Log climbs to see your grade distribution.')}</div>
        <div class="card">
        <h2>Weekly training load</h2>${Array.from({ length: 4 }, (_, i) => {
        let end = dateAt(-7 * (3 - i)), start = dateAt(-7 * (3 - i) - 6), s = all.filter(s => s.date >= start && s.date <= end);
        return `<div class="listrow row">
            <span>${fmt(start)} – ${fmt(end)}</span>
            <strong>${s.reduce((a, x) => a + sessionLoad(x), 0)}</strong>
            </div>`;
    }).join('')}<small>Session load is a subjective workload proxy, not an injury prediction.</small>
        </div>
        </section>
        <section>
        <h2>Performance measurements</h2>${tests || '<div class="card">' + empty('Add standardized strength or endurance measurements in the session logger.') + '</div>'}</section>
        </div>`;
}

function coachPage() {
    const r = rec();
    return title('Your training assistant', 'Ask the coach.', 'A local, rules-based prototype. No external AI service is connected.') + `<div class="card">
        <div class="chat">
        <div class="bubble coach">Hi! I can review your logged sessions, suggest a workout, explain recovery priorities and summarize your progress. Use the Log tab to save detailed training data.</div>${state.chat.map(c => `<div class="bubble ${c.role === 'user' ? 'user' : 'coach'}">${esc(c.text)}</div>`).join('')}</div>
        <div class="chips" style="margin-bottom:12px">${['What should I train today?', 'How is my recovery?', 'Analyze my progress', 'How is my training load?'].map(q => `<button class="smallbtn" data-act="prompt" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
        <form id="chat-form">
        <label>Your message<textarea name="message" required placeholder="Ask about your training…">
        </textarea>
        </label>
        <button class="primary">Send</button>
        </form>
        </div>
        <div class="card">
        <h2>Current recommendation</h2>
        <strong>${esc(r.title)}</strong>
        <p class="muted">${esc(r.detail)}</p>
        </div>`;
}

function answer(q) {
    let x = q.toLowerCase(), r = rec(), w = recent(7), m = recent(28);
    if (/progress|stat|improv|growth|trend/.test(x)) {
        let sends = m.reduce((a, s) => a + s.climbs.reduce((b, c) => b + c.sends, 0), 0);
        return `Last 28 days: ${m.length} sessions, ${sends} recorded sends and ${m.reduce((a, s) => a + s.tests.length, 0)} performance measurements. See Stats for grade distribution and comparable measurement trends. ${m.length < 2 ? 'More sessions are needed to assess progress.' : 'Compare standardized tests before concluding that performance has improved.'}`;
    }

    if (/load|volume/.test(x))
        return `Last 7 days: ${w.length} sessions, ${w.reduce((a, s) => a + s.duration, 0)} minutes, ${w.reduce((a, s) => a + sessionLoad(s), 0)} session load units (minutes × RPE). ${w.filter(s => s.finger === 'High').length} high finger-load sessions. This is a workload estimate, not an injury prediction.`;
    if (/recover|rest|sore|sleep/.test(x))
        return `${r.status}. ${r.detail} Recovery depends on symptoms and your actual performance; don't load painful fingers.`;
    if (/train|workout|today|recommend|session/.test(x))
        return `${r.title}\n${r.detail}\n${r.steps.map(s => '• ' + s).join('\n')}`;
    return 'This prototype recognizes workout recommendations, recovery, progress and training load questions. Free-form AI coaching and natural-language workout logging will be added when a secure AI backend is connected.';
}

function ask(q) {
    if (!q.trim())
        return;
    state.chat.push({ role: 'user', text: q.trim() }, { role: 'coach', text: answer(q) });
    state.chat = state.chat.slice(-40);
    save();
    render();
}

function render() {
    current = tabs.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'today';
    $('#nav').innerHTML = tabs.map(t => `<a href="#${t}" class="${t === current ? 'active' : ''}" ${t === current ? 'aria-current="page"' : ''}>
        <svg viewBox="0 0 24 24">${icons[t]}</svg>${t[0].toUpperCase() + t.slice(1)}</a>`).join('');
    $('#view').innerHTML = ({
        today: todayPage, log: logPage, plan: planPage, stats: statsPage, coach: coachPage
    })[current]();
}

function go(t) {
    if (location.hash === '#' + t)
        render();
    else
        location.hash = t;
}

function modal(html) {
    $('#modal-content').innerHTML = html;
    $('#modal').showModal();
}

function close() {
    $('#modal').close();
}

function checkin() {
    const r = latestRecovery() || {
        sleep: 8, soreness: 1, energy: 4, pain: false
    };
    modal(`<div class="row">
        <h2>Recovery check-in</h2>
        <button data-act="close" aria-label="Close">×</button>
        </div>
        <form id="recovery-form">
        <label>Sleep (hours)<input name="sleep" type="number" step="0.5" min="0" max="24" required value="${r.sleep}">
        </label>
        <label>Finger soreness (0–5)<input name="soreness" type="number" min="0" max="5" required value="${r.soreness}">
        </label>
        <label>Energy (1–5)<input name="energy" type="number" min="1" max="5" required value="${r.energy}">
        </label>
        <label style="display:flex;align-items:center;gap:12px">
        <input name="pain" type="checkbox" style="width:20px;min-height:24px" ${r.pain ? 'checked' : ''}> Current finger pain</label>
        <button class="primary">Save check-in</button>
        </form>`);
}

function planModal(p) {
    modal(`<div class="row">
        <h2>${p.id ? 'Edit' : 'Add'} planned day</h2>
        <button data-act="close" aria-label="Close">×</button>
        </div>
        <form id="plan-form">
        <input type="hidden" name="id" value="${esc(p.id || '')}">
        <label>Date<input type="date" name="date" required value="${p.date}">
        </label>
        <label>Focus<select name="type">${options(types, p.type || 'Technique')}</select>
        </label>
        <label>Details<textarea name="note">${esc(p.note || '')}</textarea>
        </label>
        <label style="display:flex;align-items:center;gap:12px">
        <input type="checkbox" name="done" style="width:20px;min-height:24px" ${p.done ? 'checked' : ''}> Completed</label>
        <button class="primary">Save planned day</button>${p.id ? `<button type="button" class="danger" data-act="deletePlan" data-id="${esc(p.id)}">Delete</button>` : ''}</form>`);
}

function syncDraft() {
    const f = $('#session-form');
    if (!f || !state.draft)
        return;
    let d = new FormData(f);
    Object.assign(state.draft, {
        date: d.get('date'), type: d.get('type'), duration: Number(d.get('duration')), rpe: Number(d.get('rpe')), finger: d.get('finger'), notes: d.get('notes')
    });
    save();
}
$('#view').addEventListener('input', e => {
    if (e.target.closest('#session-form'))
        syncDraft();
});
document.addEventListener('click', e => {
    let b = e.target.closest('[data-act]');
    if (!b)
        return;
    let a = b.dataset.act, id = b.dataset.id;
    switch (a) {
        case 'close':
            close();
            break;
        case 'new':
        case 'start':
            if (state.draft && !confirm('Replace unfinished draft?'))
                return;
            state.draft = newDraft(b.dataset.type);
            save();
            go('log');
            break;
        case 'edit':
            if (state.draft && !confirm('Replace unfinished draft?'))
                return;
            state.draft = JSON.parse(JSON.stringify(state.sessions.find(s => s.id === id)));
            save();
            go('log');
            break;
        case 'cancelDraft':
            if (confirm('Discard unsaved changes?')) {
                state.draft = null;
                save();
                render();
            }
            break;
        case 'delete':
            if (confirm('Delete this session permanently?')) {
                state.sessions = state.sessions.filter(s => s.id !== state.draft.id);
                state.draft = null;
                save();
                render();
                toast('Session deleted');
            }
            break;
        case 'removeClimb':
        case 'removeTest':
            syncDraft();
            state.draft[a === 'removeClimb' ? 'climbs' : 'tests'].splice(+b.dataset.i, 1);
            save();
            render();
            break;
        case 'checkin':
            checkin();
            break;
        case 'addPlan':
            planModal({ date: b.dataset.date });
            break;
        case 'editPlan':
            planModal(state.plan.find(p => p.id === id));
            break;
        case 'deletePlan':
            state.plan = state.plan.filter(p => p.id !== id);
            save();
            close();
            render();
            break;
        case 'suggestPlan':
            if (confirm('Add suggested sessions to unplanned days over the next week? Existing plans will stay unchanged.')) {
                let r = rec();
                let seq = [
                    r.type, 'Active recovery', 'Aerobic / ARC', 'Finger strength', 'Rest', 'Technique', 'Rest'
                ];
                if (latestRecovery()?.pain)
                    seq = [
                        'Rest', 'Rest', 'Rest', 'Rest', 'Rest', 'Rest', 'Rest'
                    ];
                seq.forEach((type, i) => {
                    let date = dateAt(i);
                    if (!state.plan.some(p => p.date === date))
                        state.plan.push({
                            id: uid(), date, type, note: 'Provisional suggestion; reassess readiness before training.', done: false
                        });
                });
                save();
                render();
                toast('Suggested week added');
            }
            break;
        case 'prompt':
            ask(b.dataset.q);
            break;
        case 'export': {
            const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })), a = document.createElement('a');
            a.href = url;
            a.download = 'cruxlab-backup-' + today() + '.json';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            break;
        }
        case 'reset':
            if (confirm('Delete all local training data? Export a backup first.')) {
                state = blank();
                save();
                close();
                render();
                toast('Data cleared');
            }
            break;
    }
});
document.addEventListener('submit', e => {
    let f = e.target;
    if (![
        'session-form', 'climb-form', 'test-form', 'recovery-form', 'plan-form', 'chat-form', 'goal-form'
    ].includes(f.id))
        return;
    e.preventDefault();
    let d = new FormData(f);
    switch (f.id) {
        case 'session-form':
            syncDraft();
            if (state.draft.date > today()) {
                toast('Log completed sessions only; use Plan for future days.');
                return;
            }
            let s = { ...state.draft, id: state.draft.id || uid() };
            state.sessions = state.sessions.filter(x => x.id !== s.id);
            state.sessions.push(s);
            state.draft = null;
            save();
            render();
            toast('Session saved');
            break;
        case 'climb-form':
            if (+d.get('sends') > +d.get('attempts')) {
                toast('Sends cannot exceed attempts');
                return;
            }
            syncDraft();
            state.draft.climbs.push({
                grade: d.get('grade'), sends: +d.get('sends'), attempts: +d.get('attempts')
            });
            save();
            render();
            toast('Climbs added');
            break;
        case 'test-form':
            syncDraft();
            state.draft.tests.push({
                name: d.get('name'), value: +d.get('value'), unit: d.get('unit'), protocol: d.get('protocol')
            });
            save();
            render();
            toast('Measurement added');
            break;
        case 'recovery-form':
            state.recovery = state.recovery.filter(r => r.date !== today());
            state.recovery.push({
                date: today(), sleep: +d.get('sleep'), soreness: +d.get('soreness'), energy: +d.get('energy'), pain: d.has('pain')
            });
            save();
            close();
            render();
            toast('Check-in saved');
            break;
        case 'plan-form': {
            let id = d.get('id') || uid();
            state.plan = state.plan.filter(p => p.id !== id);
            state.plan.push({
                id, date: d.get('date'), type: d.get('type'), note: d.get('note'), done: d.has('done')
            });
            save();
            close();
            render();
            toast('Plan saved');
            break;
        }
        case 'goal-form':
            state.goal = d.get('goal');
            save();
            toast('Goal saved');
            break;
        case 'chat-form':
            ask(d.get('message'));
            break;
    }
});
$('#settings').addEventListener('click', () => modal(`<div class="row">
    <h2>Data & settings</h2>
    <button data-act="close" aria-label="Close">×</button>
    </div>
    <p class="muted">Your data stays in this browser. Export regular backups; clearing site storage removes your log. No account or cloud sync is connected.</p>
    <div class="stack" style="margin-top:15px">
    <button data-act="export">Export JSON backup</button>
    <label>Restore JSON backup<input type="file" id="restore" accept=".json,application/json">
    </label>
    <button class="danger" data-act="reset">Clear all local data</button>
    </div>`));
document.addEventListener('change', async (e) => {
    if (e.target.id !== 'restore')
        return;
    try {
        let v = JSON.parse(await e.target.files[0].text());
        if (!v || !['sessions', 'recovery', 'plan', 'chat'].every(k => Array.isArray(v[k])) || !v.sessions.every(s => typeof s.date === 'string' && Array.isArray(s.climbs) && Array.isArray(s.tests) && Number.isFinite(s.duration) && Number.isFinite(s.rpe)))
            throw Error();
        if (confirm('Replace all current data with this backup?')) {
            state = { ...blank(), ...v };
            save();
            close();
            render();
            toast('Backup restored');
        }
    }
    catch {
        toast('Invalid backup file');
    }
});
window.addEventListener('hashchange', () => {
    render();
    window.scrollTo(0, 0);
});
render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http'))
    navigator.serviceWorker.register('./sw.js').catch(() => {
    });
