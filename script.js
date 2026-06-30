  function setVersion(text) {
    document.querySelectorAll('.app-version').forEach(el => el.textContent = text);
  }

  async function loadLatestRelease() {
    const url = 'https://api.github.com/repos/etet100/AstroCore-GCode-Sender/releases?per_page=1';
    try {
      const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return;
      const release = data[0];
      const tag = release.tag_name ?? '';
      const date = release.published_at
        ? new Date(release.published_at).toLocaleString('en', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
      setVersion(tag + (date ? ' \u00b7 ' + date : ''));
    } catch {
      // silently ignore network errors
    }
  }

  loadLatestRelease();

  function openModal(src) {
    document.getElementById('modal-img').src = src;
    document.getElementById('modal').classList.add('open');
  }
  function closeModal() {
    document.getElementById('modal').classList.remove('open');
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // ── DRO animation ──
  const droState = { x: 124.350, y: -32.175, z: 0.000 };
  const droTarget = { x: 124.350, y: -32.175, z: 0.000 };

  function fmtAxis(v) {
    const sign = v >= 0 ? '+' : '-';
    const abs = Math.abs(v);
    const int = String(Math.floor(abs)).padStart(3, '0');
    const dec = abs.toFixed(3).split('.')[1];
    return sign + int + '.' + dec;
  }

  function pickNewTarget() {
    droTarget.x = (Math.random() * 280 - 20);
    droTarget.y = (Math.random() * 160 - 80);
    droTarget.z = 0;
  }

  pickNewTarget();

  setInterval(() => {
    const lerp = 0.04;
    droState.x += (droTarget.x - droState.x) * lerp;
    droState.y += (droTarget.y - droState.y) * lerp;
    const dx = document.getElementById('dro-x');
    const dy = document.getElementById('dro-y');
    if (dx) dx.textContent = fmtAxis(droState.x);
    if (dy) dy.textContent = fmtAxis(droState.y);
    const dist = Math.hypot(droTarget.x - droState.x, droTarget.y - droState.y);
    if (dist < 0.5) pickNewTarget();
  }, 60);

  // ── Toolpath animation (stroke-dashoffset) ──
  const tpAnim = document.getElementById('tp-anim');
  const tpTool = document.getElementById('tp-tool');
  const tpToolRing = document.getElementById('tp-tool-ring');
  const tpProgress = document.getElementById('tp-progress');

  if (tpAnim) {
    const totalLen = tpAnim.getTotalLength();
    tpAnim.style.strokeDasharray = totalLen;
    tpAnim.style.strokeDashoffset = totalLen;

    // Waypoints along path
    let pct = 0.47;
    let dir = 1;

    setInterval(() => {
      pct += dir * 0.0008;
      if (pct >= 1) { pct = 1; dir = -1; }
      if (pct <= 0) { pct = 0; dir = 1; }

      const drawn = pct * totalLen;
      tpAnim.style.strokeDashoffset = totalLen - drawn;

      // Move tool dot to current tip
      const pt = tpAnim.getPointAtLength(drawn);
      tpTool.setAttribute('cx', pt.x);
      tpTool.setAttribute('cy', pt.y);
      tpToolRing.setAttribute('cx', pt.x);
      tpToolRing.setAttribute('cy', pt.y);
      tpProgress.textContent = Math.round(pct * 100) + '%';
    }, 30);
  }

  // ── G-code terminal scrolling ──
  const gcLines = [
    ['move', 'G1', 'X124.350 Y-32.175', 'F800'],
    ['ok', '', '', ''],
    ['move', 'G1', 'X150.000', 'F800'],
    ['ok', '', '', ''],
    ['move', 'G0', 'Z5.000', ''],
    ['ok', '', '', ''],
    ['comment', '(rapid to next pass)', '', ''],
    ['move', 'G0', 'X50.000 Y-32.175', ''],
    ['ok', '', '', ''],
    ['move', 'G1', 'Z-0.500', 'F100'],
    ['ok', '', '', ''],
    ['move', 'G1', 'X270.000', 'F800'],
    ['ok', '', '', ''],
    ['move', 'G1', 'Y-60.000', 'F600'],
    ['ok', '', '', ''],
    ['move', 'G1', 'X50.000', 'F800'],
    ['ok', '', '', ''],
    ['comment', '(pocket layer 2)', '', ''],
    ['move', 'G1', 'Z-1.000', 'F100'],
    ['ok', '', '', ''],
  ];

  let gcIdx = 0;
  const gcContainer = document.getElementById('gcode-lines');

  function addGcodeLine() {
    if (!gcContainer) return;
    const [type, cmd, coords, feed] = gcLines[gcIdx % gcLines.length];
    gcIdx++;

    const div = document.createElement('div');
    div.className = 'gcode-line';

    if (type === 'ok') {
      div.innerHTML = '<span class="prompt">›</span><span class="gc-ok">[ok]</span>';
    } else if (type === 'comment') {
      div.innerHTML = `<span class="prompt">›</span><span class="gc-comment">${cmd}</span>`;
    } else {
      div.innerHTML = `<span class="prompt">›</span><span class="gc-move">${cmd}</span>${coords ? '&nbsp;<span class="gc-coord">' + coords + '</span>' : ''}${feed ? '&nbsp;<span class="gc-feed">' + feed + '</span>' : ''}`;
    }

    // Remove active from previous
    gcContainer.querySelectorAll('.gc-active').forEach(el => el.classList.remove('gc-active'));
    if (type !== 'ok') div.classList.add('gc-active');

    gcContainer.appendChild(div);

    // Keep only last 9 lines
    while (gcContainer.children.length > 9) {
      gcContainer.removeChild(gcContainer.firstChild);
    }
  }

  setInterval(addGcodeLine, 900);
