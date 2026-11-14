const $ = (s) => document.querySelector(s);
const get = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) || d;
  } catch (e) {
    return d;
  }
};
const put = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const esc = (s) =>
  String(s || "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );

let users = get("ll_users", []);
let contacts = get("ll_contacts", []);
let me = get("ll_me", null);
let signup = false;
let editId = null;
let justAdded = null;

if (!users.some((u) => u.role === "admin")) {
  users.push({
    name: "Demo Admin",
    email: "admin@lifeline.app",
    password: "admin123",
    role: "admin",
  });
  put("ll_users", users);
}

function view() {
  const admin = me && me.role === "admin";
  $("#auth").hidden = !!me;
  $("#home").hidden = !me || admin;
  $("#admin").hidden = !admin;
  $("#logout").hidden = !me;
  if (me) admin ? renderAdmin() : renderHome();
}

const mine = () =>
  contacts
    .filter((c) => c.owner === me.email)
    .sort((a, b) => b.primary - a.primary || a.name.localeCompare(b.name));

function renderHome() {
  $("#hi").textContent = "Hi, " + me.name.split(" ")[0];
  const l = mine();
  $("#list").innerHTML = l.length
    ? l
        .map(
          (c) => `
    <li class="${c.id === justAdded ? "new" : ""}">
      <div>
        <b>${esc(c.name)}</b> ${
            c.primary ? '<span class="tag">Primary</span>' : ""
          }<br>
        <small>${esc(c.relation)} · ${esc(c.phone)}</small>
        ${c.notes ? `<br><small>${esc(c.notes)}</small>` : ""}
      </div>
      <div class="acts">
        <button data-e="${c.id}">Edit</button>
        <button data-d="${c.id}">Delete</button>
      </div>
    </li>`
        )
        .join("")
    : '<li class="empty">No contacts yet. Tap "+ Add contact".</li>';
}

function renderAdmin() {
  const q = $("#search").value.toLowerCase();
  const owner = (c) => users.find((u) => u.email === c.owner);
  const rows = contacts.filter((c) =>
    (c.name + c.phone + c.owner + (owner(c) ? owner(c).name : ""))
      .toLowerCase()
      .includes(q)
  );
  $("#all").innerHTML = rows.length
    ? rows
        .map(
          (c) => `
    <li>
      <div>
        <b>${esc(c.name)}</b><br>
        <small>${esc(c.relation)} · ${esc(c.phone)}</small><br>
        <small>Contact of ${esc(owner(c) ? owner(c).name : c.owner)}</small>
      </div>
      <a class="call" href="tel:${esc(c.phone)}">Call</a>
    </li>`
        )
        .join("")
    : '<li class="empty">No contacts found.</li>';
}

$("#switchLink").onclick = (e) => {
  e.preventDefault();
  signup = !signup;
  $("#name").hidden = !signup;
  $("#name").required = signup;
  $("#authTitle").textContent = signup ? "Create account" : "Welcome back";
  $("#authBtn").textContent = signup ? "Sign up" : "Log in";
  $("#switchTxt").textContent = signup ? "Have an account?" : "New here?";
  $("#switchLink").textContent = signup ? "Log in" : "Sign up";
  $("#authErr").textContent = "";
};

$("#authForm").onsubmit = (e) => {
  e.preventDefault();
  const email = $("#email").value.trim().toLowerCase();
  const pw = $("#password").value;
  const err = $("#authErr");
  if (signup) {
    if (users.some((u) => u.email === email)) {
      err.textContent = "That email is already registered. Log in instead.";
      return;
    }
    const u = {
      name: $("#name").value.trim(),
      email,
      password: pw,
      role: "user",
    };
    users.push(u);
    put("ll_users", users);
    me = u;
  } else {
    const u = users.find((u) => u.email === email && u.password === pw);
    if (!u) {
      err.textContent = "Wrong email or password. Check both and try again.";
      return;
    }
    me = u;
  }
  put("ll_me", me);
  err.textContent = "";
  e.target.reset();
  view();
};

$("#logout").onclick = () => {
  me = null;
  localStorage.removeItem("ll_me");
  view();
};

function openForm(id) {
  editId = id || null;
  const c = contacts.find((c) => c.id === id) || {};
  $("#fTitle").textContent = id ? "Edit contact" : "Add contact";
  $("#cName").value = c.name || "";
  $("#cRel").value = c.relation || "";
  $("#cPhone").value = c.phone || "";
  $("#cNotes").value = c.notes || "";
  $("#cPrimary").checked = !!c.primary;
  $("#formDlg").showModal();
}

$("#addBtn").onclick = () => openForm();
$("#cancel").onclick = () => $("#formDlg").close();

$("#contactForm").onsubmit = (e) => {
  e.preventDefault();
  const data = {
    name: $("#cName").value.trim(),
    relation: $("#cRel").value.trim(),
    phone: $("#cPhone").value.trim(),
    notes: $("#cNotes").value.trim(),
    primary: $("#cPrimary").checked,
  };
  if (!editId && !mine().length) data.primary = true;
  if (data.primary)
    contacts.forEach((c) => {
      if (c.owner === me.email) c.primary = false;
    });
  if (editId)
    Object.assign(
      contacts.find((c) => c.id === editId),
      data
    );
  else {
    justAdded =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    contacts.push({ id: justAdded, owner: me.email, ...data });
  }
  put("ll_contacts", contacts);
  $("#formDlg").close();
  renderHome();
  justAdded = null;
};

$("#list").onclick = (e) => {
  const d = e.target.dataset;
  if (d.e) openForm(d.e);
  if (d.d && confirm("Delete this contact?")) {
    contacts = contacts.filter((c) => c.id !== d.d);
    put("ll_contacts", contacts);
    renderHome();
  }
};

$("#sos").onclick = () => {
  const l = mine();
  $("#callList").innerHTML = l.length
    ? l
        .map(
          (c) =>
            `<a class="callbtn" href="tel:${esc(c.phone)}"><b>${esc(
              c.name
            )}</b><small>${esc(c.relation)} · ${esc(c.phone)}</small></a>`
        )
        .join("")
    : '<p class="empty">You have no contacts yet. Add one first.</p>';
  $("#callDlg").showModal();
};
$("#closeCall").onclick = () => $("#callDlg").close();

$("#search").oninput = renderAdmin;

view();
