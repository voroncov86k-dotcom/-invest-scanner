const CASH = 5000;

const positions = [
  {name:"Сбербанк", ticker:"SBER", qty:200, avg:280.39, demo:280.39},
  {name:"ВТБ", ticker:"VTBR", qty:200, avg:53.045, demo:53.045},
  {name:"Газпром", ticker:"GAZP", qty:300, avg:96.37, demo:96.37},
  {name:"VK", ticker:"VKCO", qty:100, avg:113.85, demo:113.85},
  {name:"Сургутнефтегаз", ticker:"SNGS", qty:1400, avg:15.13, demo:15.13},
  {name:"ФосАгро", ticker:"PHOR", qty:5, avg:5110, demo:5110},
  {name:"Эталон Груп", ticker:"ETLN", qty:210, avg:18.46, demo:18.46},
  {name:"Яндекс", ticker:"YDEX", qty:6, avg:3610, demo:3610}
];

const money = n => `${new Intl.NumberFormat("ru-RU",{maximumFractionDigits:1}).format(n)} ₽`;
const price = n => `${new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(n)} ₽`;

async function getQuote(ticker, fallback) {
  const url =
    `https://iss.moex.com/iss/engines/stock/markets/shares/securities/${ticker}.json` +
    `?iss.meta=off&iss.only=marketdata&marketdata.columns=SECID,LAST,LASTCHANGE,LASTCHANGEPRC`;

  try {
    const r = await fetch(url, {cache:"no-store"});
    if (!r.ok) throw new Error("HTTP");
    const j = await r.json();
    const block = j.marketdata;
    if (!block || !block.data || !block.data.length) throw new Error("no data");
    const row = block.data[0];
    const last = Number(row[1]);
    const change = Number(row[2]);
    const changePct = Number(row[3]);
    if (!Number.isFinite(last) || last <= 0) throw new Error("bad price");
    return {last, change, changePct, live:true};
  } catch {
    return {last:fallback, change:0, changePct:0, live:false};
  }
}

function signalFor(p, q) {
  const delta = ((q.last - p.avg) / p.avg) * 100;

  if (p.ticker === "SBER") {
    if (q.last >= 274 && q.last <= 275.5) return {text:"ПОКУПКА", cls:"buy"};
    if (q.last < 271.5) return {text:"СТОП / НЕ ДОБИРАТЬ", cls:"sell"};
    return {text:"ДЕРЖАТЬ", cls:"hold"};
  }

  if (delta <= -30) return {text:"ДЕРЖАТЬ", cls:"hold"};
  if (delta >= 5) return {text:"ДЕРЖАТЬ", cls:"hold"};
  return {text:"НАБЛЮДАТЬ", cls:"watch"};
}

function render(rows) {
  const total = rows.reduce((s, x) => s + x.p.qty * x.q.last, 0);
  const cost = rows.reduce((s, x) => s + x.p.qty * x.p.avg, 0);
  const pnl = total - cost;

  document.querySelector("#portfolioValue").textContent = money(total + CASH);
  document.querySelector("#resultValue").textContent = `${pnl >= 0 ? "+" : "−"}${money(Math.abs(pnl))}`;
  document.querySelector("#resultValue").className = pnl >= 0 ? "green" : "red";

  const html = rows.map(({p,q}) => {
    const s = signalFor(p,q);
    const value = p.qty * q.last;
    const ch = q.changePct;
    const chText = q.live && Number.isFinite(ch)
      ? ` · ${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`
      : "";
    return `<div class="row">
      <div>
        <div class="name">${p.name}</div>
        <div class="meta">${p.qty} шт · средняя ${price(p.avg)} · сейчас ${price(q.last)}${chText}</div>
      </div>
      <div class="right">
        <span class="sig ${s.cls}">${s.text}</span>
        <div class="meta">${money(value)}</div>
      </div>
    </div>`;
  }).join("");

  document.querySelector("#portfolio").innerHTML = html;

  const sber = rows.find(x => x.p.ticker === "SBER");
  if (sber) {
    const q = sber.q;
    const s = signalFor(sber.p,q);
    document.querySelector("#todayName").textContent = sber.p.name;
    document.querySelector("#todaySignal").textContent = s.text;
    document.querySelector("#todaySignal").className = s.cls;
    document.querySelector("#todayPrice").textContent = price(q.last);
    document.querySelector("#todayStop").textContent = price(271.5);
    document.querySelector("#todayTarget").textContent = "280–283 ₽";
  }

  const liveCount = rows.filter(x => x.q.live).length;
  document.querySelector("#status").textContent = `MOEX: ${liveCount}/${rows.length} котировок`;
  document.querySelector("#updated").textContent =
    `Обновлено: ${new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}. ` +
    (liveCount === rows.length ? "Котировки получены." : "Часть данных показана из сохранённых значений.");
}

async function refresh() {
  document.querySelector("#refresh").disabled = true;
  document.querySelector("#status").textContent = "Обновление…";
  const rows = [];
  for (const p of positions) rows.push({p, q:await getQuote(p.ticker,p.demo)});
  render(rows);
  document.querySelector("#refresh").disabled = false;
}

document.querySelector("#refresh").addEventListener("click", refresh);
refresh();
