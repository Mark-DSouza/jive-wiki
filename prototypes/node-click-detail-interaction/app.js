(function () {
  'use strict';

  // Three variants of the node-click-to-detail interaction, switchable via #variant=,
  // on the existing Obsidian Void graph theme (locked in issue #4). Graph rendering
  // itself does not change across variants — only what happens after a node is clicked.

  // ---- real move data, pulled from content/moves/*.md (frontmatter + body sections) ----
  var CLUSTERS = {
    'cha-cha-cha':   { label: 'Cha Cha Cha',    color: '#8b5cf6' },
    'turns-spins':   { label: 'Turns & Spins',  color: '#38bdf8' },
    'circle-cradle': { label: 'Circle & Cradle', color: '#34d399' },
    'holds-lifts':   { label: 'Holds & Lifts',  color: '#f472b6' }
  };

  var MOVES = {
    'cradle': {
      name: 'Cradle', cluster: 'circle-cradle', description: '', steps: '', holdHandPosition: '',
      lead: ['Spin her in and out 3 times.', 'With your right hand, keep her hand on your shoulder.', 'Bring her back and raise her.', 'Walk with her all over the dance.', 'Cradle to the left and to the right.', 'Cradle turn to the left and cradle.'],
      transitionsOut: [], notes: ''
    },
    'windmill': {
      name: 'Windmill', cluster: 'holds-lifts', description: '', steps: '', holdHandPosition: '',
      lead: [], transitionsOut: [], notes: 'Source list gave no further detail beyond the name.'
    },
    'around-the-world': {
      name: 'Around the World', cluster: 'circle-cradle', description: '', steps: '', holdHandPosition: '',
      lead: ['Left hand across your back.', 'Move to the left.', 'Comb with right hand.', 'Around the world.', 'Go under the hand.', 'Cradle.'],
      transitionsOut: ['cradle'], notes: ''
    },
    'closed-cha-cha-cha': {
      name: 'Closed Cha Cha Cha', cluster: 'cha-cha-cha', description: '', steps: '', holdHandPosition: 'Closed hold.',
      lead: ['When your left hand is extended, grab her shoulder blade.', 'Give her the signal for a turn by raising your left arm and push, and raising the right arm.', 'Continue cha cha one more time.', 'Spin her back.'],
      transitionsOut: [], notes: 'Also performable in open hold — see Open Cha Cha Cha.'
    },
    'open-cha-cha-cha': {
      name: 'Open Cha Cha Cha', cluster: 'cha-cha-cha', description: '', steps: '', holdHandPosition: 'Open hold.',
      lead: ['When your left hand is extended, grab her shoulder blade.', 'Give her the signal for a turn by raising your left arm and push, and raising the right arm.', 'Continue cha cha one more time.', 'Spin her back.'],
      transitionsOut: [], notes: 'Also performable in closed hold — see Closed Cha Cha Cha.'
    },
    'flick': {
      name: 'Flick', cluster: 'holds-lifts', description: '', steps: '', holdHandPosition: '',
      lead: ['Flick the hand in front.'], transitionsOut: [], notes: ''
    },
    'hammer-lock': {
      name: 'Hammer Lock', cluster: 'holds-lifts', description: '', steps: '', holdHandPosition: '',
      lead: ['Raise left hand.', 'Push lower right hand to the left.', 'Then do a spin (double turn).', 'Or then do around the world.'],
      transitionsOut: ['spin', 'around-the-world'], notes: ''
    },
    'i-go-round-and-you-go-round': {
      name: 'I Go Round and You Go Round', cluster: 'circle-cradle', description: '', steps: '', holdHandPosition: '',
      lead: ['Cradle.', 'Reel her in and high five with some native momentum on the right.', 'High five with some momentum on the left.', 'Take her.', 'Take yourself round.', 'Open hold her on your right.', 'Open hold her on your left.', 'Push and release left and spin her out.'],
      transitionsOut: ['cradle'], notes: ''
    },
    'over-the-shoulder': {
      name: 'Over the Shoulder', cluster: 'holds-lifts', description: '', steps: '', holdHandPosition: '',
      lead: ['Block with both hands.', 'With one hand in front.', 'Exit with windmill.', 'Into the cradle.'],
      transitionsOut: ['windmill', 'cradle'], notes: ''
    },
    'spin': {
      name: 'Spin', cluster: 'turns-spins', description: 'A double turn.', steps: '', holdHandPosition: '',
      lead: [], transitionsOut: [], notes: ''
    },
    'turn': {
      name: 'Turn', cluster: 'turns-spins', description: '', steps: '', holdHandPosition: '',
      lead: [], transitionsOut: [], notes: 'Source list gave no further detail beyond the name.'
    }
  };

  var nodes = Object.keys(MOVES).map(function (id) {
    return { id: id, name: MOVES[id].name, cluster: MOVES[id].cluster };
  });
  var links = [];
  Object.keys(MOVES).forEach(function (id) {
    MOVES[id].transitionsOut.forEach(function (target) {
      links.push({ source: id, target: target });
    });
  });

  var degree = {};
  nodes.forEach(function (n) { degree[n.id] = 0; });
  links.forEach(function (l) { degree[l.source] = (degree[l.source] || 0) + 1; degree[l.target] = (degree[l.target] || 0) + 1; });

  var graphData = {
    nodes: nodes.map(function (n) { return Object.assign({}, n, { degree: degree[n.id] || 0 }); }),
    links: links.map(function (l) { return Object.assign({}, l); })
  };

  // ---- Obsidian Void theme (locked, issue #4) ----
  var THEME = {
    bg: '#05060a',
    clusterColors: CLUSTERS,
    linkColor: 'rgba(255,255,255,0.28)',
    linkWidth: 0.6,
    arrowLength: 4,
    nodeBaseSize: 5,
    flyToEase: 900,
    autoOrbitSpeed: 0.10
  };

  function addStarfield(scene) {
    var count = 900;
    var positions = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var r = 400 + Math.random() * 600;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var mat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, sizeAttenuation: true, transparent: true, opacity: 0.55 });
    scene.add(new THREE.Points(geo, mat));
  }

  function makeNodeObject(node) {
    var color = THEME.clusterColors[node.cluster].color;
    var size = THEME.nodeBaseSize + node.degree * 2.4;
    var geo = new THREE.SphereGeometry(size, 16, 16);
    var mat = new THREE.MeshLambertMaterial({ color: color, emissive: color, emissiveIntensity: node.degree >= 2 ? 0.9 : 0.45, transparent: true, opacity: 0.95 });
    return new THREE.Mesh(geo, mat);
  }

  // ---- graph init (once, theme fixed) ----
  var container = document.getElementById('graph-container');
  var Graph = ForceGraph3D()(container)
    .graphData(graphData)
    .nodeLabel(function (n) { return n.name; })
    .linkDirectionalArrowRelPos(1)
    .backgroundColor(THEME.bg)
    .nodeThreeObject(makeNodeObject)
    .nodeThreeObjectExtend(false)
    .linkColor(function () { return THEME.linkColor; })
    .linkWidth(THEME.linkWidth)
    .linkDirectionalArrowLength(THEME.arrowLength)
    .onNodeClick(function (node) { flyToAndOpen(node.id); })
    .onBackgroundClick(function () { closeDetail(); });

  Graph.width(window.innerWidth);
  Graph.height(window.innerHeight);
  window.addEventListener('resize', function () {
    Graph.width(window.innerWidth);
    Graph.height(window.innerHeight);
  });
  addStarfield(Graph.scene());

  document.body.style.background = THEME.bg;

  var legend = document.getElementById('legend');
  Object.keys(CLUSTERS).forEach(function (c) {
    var row = document.createElement('div');
    row.className = 'legend-row';
    var sw = document.createElement('span');
    sw.className = 'legend-swatch';
    sw.style.background = CLUSTERS[c].color;
    sw.style.boxShadow = '0 0 8px ' + CLUSTERS[c].color;
    row.appendChild(sw);
    var txt = document.createElement('span');
    txt.textContent = CLUSTERS[c].label;
    row.appendChild(txt);
    legend.appendChild(row);
  });

  var autoOrbitOn = true;
  var orbitAngle = 0;
  Graph.onEngineTick(function () {
    if (!autoOrbitOn) return;
    orbitAngle += THEME.autoOrbitSpeed * 0.01;
    var camPos = Graph.cameraPosition();
    var radius = Math.hypot(camPos.x, camPos.z) || 260;
    Graph.cameraPosition({ x: radius * Math.sin(orbitAngle), y: camPos.y, z: radius * Math.cos(orbitAngle) });
  });

  function flyTo(nodeId) {
    var node = graphData.nodes.filter(function (n) { return n.id === nodeId; })[0];
    if (!node) return;
    var distance = 130;
    var distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
    Graph.cameraPosition(
      { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
      node,
      THEME.flyToEase
    );
  }

  // ---- detail-view rendering (shared across variants) ----
  function renderSection(title, bodyHtml, isEmpty) {
    return '<section class="' + (isEmpty ? 'empty' : '') + '"><h3>' + title + '</h3><div class="body">' + (isEmpty ? 'Not yet documented.' : bodyHtml) + '</div></section>';
  }

  function renderList(items) {
    return '<ul>' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>';
  }

  function renderDetailHtml(moveId) {
    var m = MOVES[moveId];
    var cluster = CLUSTERS[m.cluster];
    var html = '';
    html += '<h2>' + m.name + '</h2>';
    html += '<div class="cluster-tag" style="color:' + cluster.color + '">' + cluster.label + '</div>';
    html += renderSection('Description', '<p>' + m.description + '</p>', !m.description);
    html += renderSection('Steps', '<p>' + m.steps + '</p>', !m.steps);
    html += renderSection('Hold / hand position', '<p>' + m.holdHandPosition + '</p>', !m.holdHandPosition);
    html += renderSection('Lead', m.lead.length ? renderList(m.lead) : '', m.lead.length === 0);
    var transitionsHtml = m.transitionsOut.length
      ? m.transitionsOut.map(function (t) {
          var tc = CLUSTERS[MOVES[t].cluster];
          return '<button class="transition-chip" data-goto="' + t + '"><span class="dot" style="background:' + tc.color + '"></span>' + MOVES[t].name + '</button>';
        }).join('')
      : '';
    html += renderSection('Transitions out', transitionsHtml, m.transitionsOut.length === 0);
    html += renderSection('Notes / variations', '<p>' + m.notes + '</p>', !m.notes);
    return html;
  }

  function wireTransitionChips(containerEl) {
    containerEl.querySelectorAll('[data-goto]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        flyToAndOpen(btn.getAttribute('data-goto'));
      });
    });
  }

  // ---- Variant A: camera fly-to + overlay side panel (graph stays live behind it) ----
  var panelA = document.getElementById('panel-a');
  var panelAContent = document.getElementById('panel-a-content');
  document.getElementById('panel-a-close').addEventListener('click', closeDetail);

  function openA(moveId) {
    panelAContent.innerHTML = renderDetailHtml(moveId);
    wireTransitionChips(panelAContent);
    panelA.classList.add('open');
    container.classList.add('dimmed');
  }
  function closeA() {
    panelA.classList.remove('open');
    container.classList.remove('dimmed');
  }

  // ---- Variant B: camera fly-to + centered modal (graph dimmed/blurred behind) ----
  var modalBBackdrop = document.getElementById('modal-b-backdrop');
  var modalBContent = document.getElementById('modal-b-content');
  document.getElementById('modal-b-close').addEventListener('click', closeDetail);
  modalBBackdrop.addEventListener('click', function (e) {
    if (e.target === modalBBackdrop) closeDetail();
  });

  function openB(moveId) {
    modalBContent.innerHTML = renderDetailHtml(moveId);
    wireTransitionChips(modalBContent);
    modalBBackdrop.classList.add('open');
    container.classList.add('dimmed');
  }
  function closeB() {
    modalBBackdrop.classList.remove('open');
    container.classList.remove('dimmed');
  }

  // ---- Variant C: camera fly-to, then full-page takeover replacing the graph ----
  var pageC = document.getElementById('page-c');
  var pageCContent = document.getElementById('page-c-content');
  document.getElementById('page-c-back').addEventListener('click', closeDetail);

  function openC(moveId) {
    pageCContent.innerHTML = renderDetailHtml(moveId);
    wireTransitionChips(pageCContent);
    pageC.classList.add('open');
    container.classList.add('hidden-page');
    autoOrbitOn = false;
  }
  function closeC() {
    pageC.classList.remove('open');
    container.classList.remove('hidden-page');
    autoOrbitOn = true;
  }

  var OPENERS = { A: openA, B: openB, C: openC };
  var CLOSERS = { A: closeA, B: closeB, C: closeC };

  var currentVariant = null;
  var openMoveId = null;

  function flyToAndOpen(moveId) {
    openMoveId = moveId;
    flyTo(moveId);
    OPENERS[currentVariant](moveId);
  }

  function closeDetail() {
    if (!openMoveId) return;
    CLOSERS[currentVariant]();
    openMoveId = null;
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDetail();
  });

  // ---- variant metadata + switcher ----
  var VARIANTS = {
    A: { name: 'Overlay panel', desc: 'Camera flies to the node; a side panel slides in over the still-live, dimmed graph. Close with ×, Escape, or clicking empty space — you never really leave the graph.' },
    B: { name: 'Centered modal', desc: 'Camera flies to the node; a focused modal card appears over a dimmed/blurred graph. Close with ×, Escape, or the backdrop — a deliberate step out to read, then back.' },
    C: { name: 'Full-page takeover', desc: 'Camera flies to the node, then the graph is fully replaced by a dedicated detail page. Chain directly move-to-move via Transitions out chips without returning to the graph; ← Back to graph or Escape to resume.' }
  };
  var ORDER = ['A', 'B', 'C'];

  function applyVariant(key) {
    if (openMoveId && currentVariant) CLOSERS[currentVariant]();
    openMoveId = null;
    currentVariant = key;

    var v = VARIANTS[key];
    document.getElementById('variant-name-n').textContent = v.name;
    document.getElementById('variant-name-d').textContent = v.desc;
    document.getElementById('switcher-label').textContent = key + ' — ' + v.name;
  }

  function currentKeyFromHash() {
    var m = /variant=([ABC])/.exec(location.hash);
    return m ? m[1] : 'A';
  }
  function goTo(key) {
    history.replaceState(null, '', '#variant=' + key);
    applyVariant(key);
  }
  function step(delta) {
    var idx = ORDER.indexOf(currentVariant);
    goTo(ORDER[(idx + delta + ORDER.length) % ORDER.length]);
  }
  document.getElementById('prev').addEventListener('click', function () { step(-1); });
  document.getElementById('next').addEventListener('click', function () { step(1); });
  window.addEventListener('keydown', function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable)) return;
    if (e.key === 'ArrowLeft' && !openMoveId) step(-1);
    if (e.key === 'ArrowRight' && !openMoveId) step(1);
  });
  window.addEventListener('hashchange', function () { applyVariant(currentKeyFromHash()); });

  goTo(currentKeyFromHash());
})();
