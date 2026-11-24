// ===================================================================
//  এটিই একমাত্র সেটিং ফাইল। শুধু নিচের ১ নম্বর লাইনটি বদলালেই সাইট চালু হবে।
// ===================================================================

// ১) Google Apps Script-এর Web App URL এখানে বসান (README.txt দেখুন)
window.APP_URL = "PASTE_YOUR_WEB_APP_URL_HERE";

// ২) সাইটের নাম ও ট্যাগলাইন — বদলালে সব পেজে আপনা-আপনি বদলে যাবে
window.SITE = {
  name: "বারকোড স্টুডিও",
  tagline: "এক্সেল থেকে এক ক্লিকে বারকোড ও প্রিন্ট-ব্লক"
};

// ---------- এর নিচের অংশ বদলানোর দরকার নেই ----------

window.LOGO_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 5v14M7 5v14M11 5v14M14 5v14M17 5v14M20 5v14"/></svg>';

// সার্ভারের সাথে যোগাযোগ (Content-Type না দিলে ব্রাউজার "simple request" পাঠায়, তাই CORS সমস্যা হয় না)
window.api = async function (data) {
  if (!window.APP_URL || window.APP_URL.indexOf("PASTE_") === 0)
    return { ok: false, error: "config.js-এ Web App URL বসানো হয়নি।" };
  try {
    const r = await fetch(window.APP_URL, { method: "POST", body: JSON.stringify(data) });
    return await r.json();
  } catch (e) {
    return { ok: false, error: "সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না। ইন্টারনেট/URL যাচাই করুন।" };
  }
};

// সাইটের নাম, লোগো, সাল সব পেজে বসিয়ে দেয়
window.fillBrand = function (pageTitle) {
  const S = window.SITE;
  document.title = (pageTitle ? pageTitle + " | " : "") + S.name;
  document.querySelectorAll("[data-brand]").forEach(function (e) { e.textContent = S.name; });
  document.querySelectorAll("[data-tagline]").forEach(function (e) { e.textContent = S.tagline; });
  document.querySelectorAll("[data-logo]").forEach(function (e) { e.innerHTML = window.LOGO_SVG; });
  document.querySelectorAll("[data-year]").forEach(function (e) { e.textContent = new Date().getFullYear(); });
};

// লগইন/সাইন আপের পর সেশন শুরু (পরের পেজ যাতে সাথে সাথে খোলে)
window.startSession = function (d) {
  localStorage.setItem("bc_token", d.token);
  try {
    sessionStorage.setItem("bc_sess", JSON.stringify({ t: d.token, at: Date.now(), u: { user_id: d.user_id, email: d.email } }));
  } catch (e) {}
};

function _kick() {
  localStorage.removeItem("bc_token");
  try { sessionStorage.removeItem("bc_sess"); } catch (e) {}
  location.replace("index.html");
}

window.showFatal = function (msg) {
  document.body.classList.remove("gate");
  const d = document.createElement("div");
  d.className = "fatal";
  d.innerHTML = '<div class="card"><h2 style="margin:0 0 8px">সংযোগ সমস্যা</h2><p class="fmsg" style="color:#64748b;margin:0 0 18px"></p>' +
    '<button class="btn" onclick="location.reload()">আবার চেষ্টা করুন</button> <a class="btn ghost" href="index.html">লগইন পেজ</a></div>';
  d.querySelector(".fmsg").textContent = msg;
  document.body.appendChild(d);
};

// যে পেজ শুধু লগইন করা ইউজারের জন্য, সেখানে প্রথমেই এটি ডাকতে হয়
window.requireLogin = async function () {
  const t = localStorage.getItem("bc_token");
  if (!t) { _kick(); return null; }
  let cached = null;
  try { cached = JSON.parse(sessionStorage.getItem("bc_sess") || "null"); } catch (e) {}
  const fresh = cached && cached.t === t && Date.now() - cached.at < 600000;
  const check = window.api({ action: "verify", token: t });

  const save = function (d) {
    window.startSession({ token: t, user_id: d.user_id, email: d.email });
  };

  if (fresh) {                       // দ্রুত দেখানো হয়, আর পেছনে আবার যাচাই চলে (ব্লক হলে বের করে দেবে)
    window.USER = cached.u;
    check.then(function (d) {
      if (d.ok) save(d);
      else if (!d.error) _kick();
    });
    return cached.u;
  }
  const d = await check;
  if (d.ok) { save(d); window.USER = { user_id: d.user_id, email: d.email }; return window.USER; }
  if (d.error) { window.showFatal(d.error); return null; }   // নেটওয়ার্ক/সেটিং সমস্যা: লগআউট করা হয় না
  _kick();
  return null;
};

window.logout = async function () {
  try { await window.api({ action: "logout", token: localStorage.getItem("bc_token") }); } catch (e) {}
  localStorage.removeItem("bc_token");
  try { sessionStorage.removeItem("bc_sess"); } catch (e) {}
  location.href = "index.html";
};
