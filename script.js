/* Listening Blog — frontend-only OOP + localStorage + upload local audio via objectURL
   Usage:
   - In transcript, use token {{blank}} to mark blanks.
   - Answers input: comma separated values, in same order as blanks.
*/

const STORAGE_KEY = 'listening_lessons_v1';

class ListeningExercise {
    constructor({id, title, audioURL, transcriptHTML, answers, createdAt}) {
        this.id = id || 'l_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
        this.title = title || 'Untitled';
        this.audioURL = audioURL || '';
        this.transcriptHTML = transcriptHTML || ''; // string with <span data-blank="i"></span> tokens rendered
        this.answers = answers || []; // array of strings
        this.createdAt = createdAt || new Date().toISOString();
    }

    // render a lesson card into container
    render(parent) {
        const card = document.createElement('article');
        card.className = 'lessonCard';
        card.dataset.id = this.id;

        // header
        const header = document.createElement('div');
        header.className = 'lessonHeader';
        const h3 = document.createElement('h3');
        h3.textContent = this.title;
        header.appendChild(h3);

        // actions
        const actions = document.createElement('div');
        actions.className = 'controls';
        const delBtn = document.createElement('button'); delBtn.className='btn ghost'; delBtn.textContent='Delete';
        const exportBtn = document.createElement('button'); exportBtn.className='btn'; exportBtn.textContent='Export (.json)';
        actions.appendChild(exportBtn);
        actions.appendChild(delBtn);
        header.appendChild(actions);

        // audio
        const audioRow = document.createElement('div');
        audioRow.className = 'audioRow';
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = this.audioURL || '';
        audioRow.appendChild(audio);

        // transcript form
        const form = document.createElement('form');
        form.className = 'exerciseForm';
        // create paragraph from transcriptHTML (which contains placeholders we rendered earlier)
        const p = document.createElement('p');
        p.innerHTML = this.transcriptHTML; // safe because created by our code
        // convert <span data-blank="i"></span> into input elements
        p.querySelectorAll('span[data-blank]').forEach(span => {
            const idx = parseInt(span.dataset.blank,10);
            const input = document.createElement('input');
            input.type='text';
            input.className='blankInput';
            input.dataset.index = idx;
            input.placeholder = '...';
            span.replaceWith(input);
        });
        form.appendChild(p);

        const submitRow = document.createElement('div');
        submitRow.className = 'controls';
        const submitBtn = document.createElement('button'); submitBtn.className='btn primary'; submitBtn.type='submit'; submitBtn.textContent='Submit';
        const showAnswerBtn = document.createElement('button'); showAnswerBtn.className='btn ghost'; showAnswerBtn.type='button'; showAnswerBtn.textContent='Show Answers';
        const downloadBtn = document.createElement('button'); downloadBtn.className='btn'; downloadBtn.type='button'; downloadBtn.textContent='Download Results';
        submitRow.appendChild(submitBtn); submitRow.appendChild(showAnswerBtn); submitRow.appendChild(downloadBtn);
        form.appendChild(submitRow);

        const resultDiv = document.createElement('div');
        resultDiv.className = 'result';
        form.appendChild(resultDiv);

        // attach events
        form.addEventListener('submit', e => {
            e.preventDefault();
            const inputs = form.querySelectorAll('input.blankInput');
            let correct = 0;
            inputs.forEach(inp => {
                const idx = Number(inp.dataset.index);
                const user = normalize(inp.value);
                const good = normalize(this.answers[idx] || '');
                if (user && user === good) {
                    correct++;
                    inp.style.borderColor = '#0b6a2f';
                    inp.style.background = '#eaffef';
                } else {
                    inp.style.borderColor = '#9b1c1c';
                    inp.style.background = '#fff5f5';
                }
            });
            const pct = Math.round((correct / this.answers.length) * 100);
            resultDiv.className = 'result ' + (pct===100 ? 'correct' : (pct>=50? '':'wrong'));
            resultDiv.innerHTML = `<div class="small">You got ${correct} / ${this.answers.length} correct (${pct}%)</div>`;
        });

        showAnswerBtn.addEventListener('click', () => {
            // toggle show/hide answers
            if (resultDiv.dataset.show === '1') {
                resultDiv.dataset.show = '0'; resultDiv.innerHTML=''; showAnswerBtn.textContent='Hide Answers';
            } else {
                resultDiv.dataset.show = '1';
                resultDiv.innerHTML = `<strong>Answers:</strong> ${this.answers.map(a=>escapeHtml(a)).join(', ')}`;
                showAnswerBtn.textContent='Show Answers';
            }
        });

        downloadBtn.addEventListener('click', () => {
            const inputs = form.querySelectorAll('input.blankInput');
            const lines = [];
            inputs.forEach(inp => {
                const idx = Number(inp.dataset.index);
                lines.push(`Blank ${idx+1}: ${inp.value} \t (answer: ${this.answers[idx]||''})`);
            });
            const blob = new Blob([lines.join('\n')], {type:'text/plain;charset=utf-8'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${this.title.replace(/\s+/g,'_')}_result.txt`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(()=>URL.revokeObjectURL(url),3000);
        });

        delBtn.addEventListener('click', () => {
            if (confirm('Delete this exercise?')) {
                removeLesson(this.id);
            }
        });

        exportBtn.addEventListener('click', () => {
            const payload = JSON.stringify(this, null, 2);
            const blob = new Blob([payload], {type:'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${this.title.replace(/\s+/g,'_')}.json`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(()=>URL.revokeObjectURL(url),3000);
        });

        // assemble
        card.appendChild(header);
        card.appendChild(audioRow);
        card.appendChild(form);

        parent.appendChild(card);
    }
}

// ---------------- storage helpers -----------------
function loadLessons() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return arr.map(o => new ListeningExercise(o));
    } catch (e) { console.error(e); return [];}
}

function saveLessons(arr) {
    const raw = JSON.stringify(arr.map(l => ({
        id: l.id, title: l.title, audioURL: l.audioURL, transcriptHTML: l.transcriptHTML, answers: l.answers, createdAt: l.createdAt
    })));
    localStorage.setItem(STORAGE_KEY, raw);
}

// ---------------- util -----------------
function normalize(s){ return (s||'').toString().trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,''); }
function escapeHtml(s){ return (s||'').toString().replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// ---------------- lesson management -----------------
let lessons = loadLessons();

function renderAll() {
    const container = document.getElementById('lessonsContainer');
    container.innerHTML = '';
    if (lessons.length === 0) {
        const p = document.createElement('div'); p.className='panel'; p.innerHTML='<p class="small muted">No exercises yet. Add one using the form on the left.</p>';
        container.appendChild(p); return;
    }
    lessons.slice().reverse().forEach(l => l.render(container));
}

function addLessonObj(obj) {
    // obj must contain title, audioURL, transcriptHTML, answers[]
    const lesson = new ListeningExercise(obj);
    lessons.push(lesson);
    saveLessons(lessons);
    renderAll();
}

function removeLesson(id) {
    lessons = lessons.filter(l => l.id !== id);
    saveLessons(lessons);
    renderAll();
}

function clearAll() {
    if (!confirm('Xóa tất cả bài trong localStorage?')) return;
    lessons = [];
    saveLessons(lessons);
    renderAll();
}

// ---------------- parse transcript token -> html -----------------
function transcriptToHTML(text) {
    // token is {{blank}}. Convert sequentially to <span data-blank="i"></span>
    let idx = 0;
    return escapeHtml(text).replace(/\{\{\s*blank\s*\}\}/gi, () => {
        return `<span data-blank="${idx++}"></span>`;
    });
}

// ---------------- UI wiring -----------------
document.addEventListener('DOMContentLoaded', () => {
    renderAll();

    const form = document.getElementById('newLessonForm');
    const audioFile = document.getElementById('audioFile');
    const audioURLInput = document.getElementById('audioURL');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value.trim();
        const transcriptRaw = document.getElementById('transcript').value.trim();
        const answersRaw = document.getElementById('answers').value.trim();

        if (!title || !transcriptRaw) { alert('Vui lòng điền ít nhất tiêu đề và transcript.'); return; }

        // build answers array
        const answers = answersRaw.length ? answersRaw.split(',').map(a=>a.trim()) : [];
        // count blanks in transcript
        const blankCount = (transcriptRaw.match(/\{\{\s*blank\s*\}\}/gi) || []).length;
        if (blankCount !== answers.length) {
            if (!confirm(`Bạn đã đánh dấu ${blankCount} chỗ trống nhưng nhập ${answers.length} đáp án.\nTiếp tục lưu?`)) return;
        }

        // audio priority: file > url
        let audioURL = '';
        if (audioFile.files && audioFile.files[0]) {
            // create objectURL (temporary URL valid for session)
            audioURL = URL.createObjectURL(audioFile.files[0]);
        } else if (audioURLInput.value.trim()) {
            audioURL = audioURLInput.value.trim();
        }

        const html = transcriptToHTML(transcriptRaw);

        addLessonObj({title, audioURL, transcriptHTML: html, answers});
        // reset form (but keep audioURL text maybe)
        form.reset();
    });

    document.getElementById('clearForm').addEventListener('click', () => form.reset());
    document.getElementById('clearAll').addEventListener('click', clearAll);

    document.getElementById('exportBtn').addEventListener('click', () => {
        const payload = JSON.stringify(lessons.map(l=>({
            id: l.id, title: l.title, audioURL: l.audioURL, transcriptHTML: l.transcriptHTML, answers: l.answers, createdAt: l.createdAt
        })), null, 2);
        const blob = new Blob([payload], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'listening_lessons_export.json';
        document.body.appendChild(a); a.click(); a.remove();
    });

    document.getElementById('importFile').addEventListener('change', (ev) => {
        const f = ev.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const arr = JSON.parse(evt.target.result);
                if (!Array.isArray(arr)) throw new Error('JSON must be an array');
                // basic validation
                arr.forEach(o => {
                    if (!o.title || !o.transcriptHTML) throw new Error('Invalid format');
                });
                // merge (avoid id collisions by generating new ids)
                arr.forEach(o => {
                    const obj = {
                        title: o.title,
                        audioURL: o.audioURL || '',
                        transcriptHTML: o.transcriptHTML,
                        answers: o.answers || [],
                        createdAt: o.createdAt || new Date().toISOString()
                    };
                    addLessonObj(obj);
                });
                alert('Nhập thành công!');
            } catch (err) { alert('Lỗi import: ' + err.message) }
        };
        reader.readAsText(f);
        ev.target.value = '';
    });

    // wire import label to hidden file input
    const importLabel = document.querySelector('.importLabel');
    importLabel.addEventListener('click', () => document.getElementById('importFile').click());
});