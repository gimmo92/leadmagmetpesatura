"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  CALENDLY_URL,
  CHIAVI_UTM,
  CTA,
  DISCLAIMER,
  FASCE_DIPENDENTI,
  MAX_JD,
  MAX_RUOLI,
  type FasciaDipendenti,
} from "@/lib/costanti";
import type { ClassificazioneGrezza, ReportRuolo } from "@/lib/classificazione";
import { MESSAGGIO_EMAIL_AZIENDALE, emailAziendaleConsentita } from "@/lib/domini";
import { etichettaConfidenza } from "@/lib/etichette";

type RuoloUi = ReportRuolo & { id: string };
type Attesa = "jd" | "pesa" | "lead" | null;
type Modalita = "jd" | "domande";

interface LeadForm {
  nome: string;
  email: string;
  azienda: string;
  dipendenti: FasciaDipendenti | "";
  ruolo: string;
  consenso: boolean;
  honeypot: string;
}

const LEAD_VUOTO: LeadForm = {
  nome: "",
  email: "",
  azienda: "",
  dipendenti: "",
  ruolo: "",
  consenso: false,
  honeypot: "",
};

const MESSAGGI: Record<Exclude<Attesa, null>, string[]> = {
  jd: ["Leggo le risposte…", "Scrivo una bozza di job description…"],
  pesa: ["Leggo la job description…", "Classifico i fattori e l'impegno…", "Calcolo il grade…"],
  lead: ["Preparo il report…", "Invio il PDF alla tua email…"],
};

const CHIAVE = "spark-pesatura-v1";

export function Pesatura({ privacyUrl }: { privacyUrl: string }) {
  const [modalita, setModalita] = useState<Modalita>("jd");
  const [titolo, setTitolo] = useState("");
  const [jd, setJd] = useState("");
  const [bozza, setBozza] = useState(false);
  const [settore, setSettore] = useState("");
  const [dimensioneAzienda, setDimensioneAzienda] = useState("");
  const [riportaA, setRiportaA] = useState("");
  const [numeroRiporti, setNumeroRiporti] = useState("");
  const [budgetOFatturato, setBudgetOFatturato] = useState("");
  const [ruoli, setRuoli] = useState<RuoloUi[]>([]);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [lead, setLead] = useState<LeadForm>(LEAD_VUOTO);
  const [sbloccato, setSbloccato] = useState(false);
  const [attesa, setAttesa] = useState<Attesa>(null);
  const [passo, setPasso] = useState(0);
  const [errore, setErrore] = useState("");
  const [conferma, setConferma] = useState("");
  const [moduloAperto, setModuloAperto] = useState(true);
  const [pronto, setPronto] = useState(false);
  const [utm, setUtm] = useState<Record<string, string>>({});

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const salvato = sessionStorage.getItem(CHIAVE);
        if (salvato) {
          const dati = JSON.parse(salvato) as { ruoli?: RuoloUi[]; lead?: LeadForm | null; sbloccato?: boolean };
          if (Array.isArray(dati.ruoli)) {
            setRuoli(dati.ruoli.slice(0, MAX_RUOLI));
            if (dati.ruoli.length > 0) setModuloAperto(false);
          }
          if (dati.lead) setLead({ ...LEAD_VUOTO, ...dati.lead, honeypot: "", consenso: true });
          if (dati.sbloccato) setSbloccato(true);
        }
      } catch {
        sessionStorage.removeItem(CHIAVE);
      }
      const parametri = new URLSearchParams(window.location.search);
      const letti: Record<string, string> = {};
      for (const chiave of CHIAVI_UTM) {
        const valore = parametri.get(chiave);
        if (valore) letti[chiave] = valore;
      }
      setUtm(letti);
      fetch("/api/stato")
        .then((risposta) => risposta.json())
        .then((dati: { sbloccato?: boolean }) => {
          if (dati.sbloccato) setSbloccato(true);
        })
        .catch(() => undefined)
        .finally(() => setPronto(true));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    sessionStorage.setItem(CHIAVE, JSON.stringify({ ruoli, lead: sbloccato ? lead : null, sbloccato }));
  }, [pronto, ruoli, lead, sbloccato]);

  useEffect(() => {
    if (!attesa) return;
    const id = window.setInterval(() => setPasso((valore) => valore + 1), 2200);
    return () => window.clearInterval(id);
  }, [attesa]);

  const ruoloAttivo = ruoli.find((ruolo) => ruolo.id === selezionato) ?? ruoli[0];
  const anagraficaPronta =
    lead.nome.trim().length >= 2 &&
    emailAziendaleConsentita(lead.email) &&
    lead.dipendenti !== "" &&
    lead.ruolo.trim().length >= 2 &&
    lead.consenso;

  async function creaBozza() {
    setErrore("");
    setConferma("");
    setPasso(0);
    if (
      titolo.trim().length < 2 ||
      settore.trim().length < 2 ||
      dimensioneAzienda.trim().length < 1 ||
      riportaA.trim().length < 2 ||
      numeroRiporti.trim().length < 1 ||
      budgetOFatturato.trim().length < 1
    ) {
      setErrore("Compila tutte le domande, incluso il titolo del ruolo.");
      return;
    }
    setAttesa("jd");
    try {
      const dati = await chiama<{ jd: string }>("/api/genera-jd", {
        titolo,
        settore,
        dimensioneAzienda,
        riportaA,
        numeroRiporti,
        budgetOFatturato,
      });
      setJd(dati.jd);
      setBozza(true);
      setModalita("jd");
    } catch (error) {
      setErrore(messaggioDi(error));
    } finally {
      setAttesa(null);
    }
  }

  async function pesa() {
    setErrore("");
    setConferma("");
    setPasso(0);
    if (titolo.trim().length < 2) {
      setErrore("Scrivi il titolo del ruolo.");
      return;
    }
    if (jd.trim().length < 40) {
      setErrore("La job description è troppo corta per una pesatura.");
      return;
    }
    if (jd.trim().length > MAX_JD) {
      setErrore("La job description supera i 6.000 caratteri.");
      return;
    }
    if (sbloccato && ruoli.length >= MAX_RUOLI) {
      setErrore("Hai raggiunto i 10 ruoli di questa prova.");
      return;
    }
    setAttesa("pesa");
    try {
      const report = await chiama<ReportRuolo>("/api/pesa", { titolo, jd });
      const nuovo: RuoloUi = { ...report, id: crypto.randomUUID() };
      setRuoli((attuali) => (sbloccato ? [...attuali, nuovo].slice(0, MAX_RUOLI) : [nuovo]));
      setSelezionato(nuovo.id);
      setModuloAperto(false);
      svuotaModulo();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErrore(messaggioDi(error));
    } finally {
      setAttesa(null);
    }
  }

  async function inviaLead() {
    setErrore("");
    setConferma("");
    setPasso(0);
    if (!lead.consenso) {
      setErrore("Per continuare serve il consenso al trattamento dei dati.");
      return;
    }
    if (!emailAziendaleConsentita(lead.email)) {
      setErrore(MESSAGGIO_EMAIL_AZIENDALE);
      return;
    }
    if (!lead.dipendenti) {
      setErrore("Seleziona il numero di dipendenti.");
      return;
    }
    if (ruoli.length === 0) {
      setErrore("Pesa almeno un ruolo prima di chiedere il report.");
      return;
    }
    setAttesa("lead");
    try {
      await chiama("/api/lead", {
        nome: lead.nome,
        email: lead.email,
        azienda: lead.azienda,
        dipendenti: lead.dipendenti,
        ruolo: lead.ruolo,
        consenso: true,
        honeypot: lead.honeypot,
        utm,
        ruoli: ruoli.map((ruolo) => ({
          titolo: ruolo.titolo,
          classificazione: classificazioneDa(ruolo),
        })),
      });
      setSbloccato(true);
      setConferma(`Report inviato a ${lead.email.trim()}. Controlla la posta, anche nello spam.`);
    } catch (error) {
      setErrore(messaggioDi(error));
    } finally {
      setAttesa(null);
    }
  }

  function svuotaModulo() {
    setTitolo("");
    setJd("");
    setBozza(false);
    setSettore("");
    setDimensioneAzienda("");
    setRiportaA("");
    setNumeroRiporti("");
    setBudgetOFatturato("");
    setModalita("jd");
  }

  function nuovaPesatura() {
    svuotaModulo();
    setErrore("");
    setConferma("");
    setModuloAperto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function tornaAlRisultato() {
    setErrore("");
    setModuloAperto(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const puoAggiungere = !sbloccato || ruoli.length < MAX_RUOLI;
  const mostraModulo = moduloAperto && puoAggiungere;
  const mostraGate = Boolean(ruoloAttivo) && (!sbloccato || !anagraficaPronta);
  const messaggioAttesa = attesa ? MESSAGGI[attesa][Math.min(passo, MESSAGGI[attesa].length - 1)] : "";

  if (!pronto) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6">
        <Image src="/logo-spark.png" alt="Spark" width={142} height={64} className="h-8 w-auto self-start" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-col gap-3">
        <Image src="/logo-spark.png" alt="Spark" width={142} height={64} className="h-8 w-auto self-start" />
        {mostraModulo && !ruoloAttivo ? (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pesatura di un ruolo</h1>
            <p className="mt-1 text-sm leading-5 text-muto">
              Una stima sui tre fattori del metodo Hay, con l’impegno richiesto dal ruolo. Il primo ruolo è immediato.
            </p>
          </div>
        ) : ruoloAttivo && puoAggiungere ? (
          <Bottone
            type="button"
            variante="secondario"
            className="w-full"
            onClick={mostraModulo ? tornaAlRisultato : nuovaPesatura}
          >
            {mostraModulo ? "Torna alla pesatura" : "Pesa un altro ruolo"}
          </Bottone>
        ) : null}
      </header>

      {mostraModulo ? (
        <section className="rounded-2xl border border-linea bg-white p-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-carta p-1 text-sm font-medium">
            <button
              type="button"
              className={tab(modalita === "jd")}
              onClick={() => setModalita("jd")}
            >
              Ho la JD
            </button>
            <button
              type="button"
              className={tab(modalita === "domande")}
              onClick={() => setModalita("domande")}
            >
              Non ho una JD
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <Campo label="Titolo del ruolo" value={titolo} onChange={setTitolo} maxLength={120} />
            {modalita === "domande" ? (
              <>
                <Campo label="Settore" value={settore} onChange={setSettore} maxLength={200} />
                <Campo
                  label="Dimensione azienda"
                  value={dimensioneAzienda}
                  onChange={setDimensioneAzienda}
                  maxLength={200}
                  placeholder="Es. 120 persone"
                />
                <Campo label="A chi riporta" value={riportaA} onChange={setRiportaA} maxLength={200} />
                <Campo
                  label="Numero di riporti"
                  value={numeroRiporti}
                  onChange={setNumeroRiporti}
                  maxLength={80}
                  placeholder="Es. 6, oppure nessuno"
                />
                <Campo
                  label="Budget o fatturato gestito"
                  value={budgetOFatturato}
                  onChange={setBudgetOFatturato}
                  maxLength={200}
                />
                <Bottone type="button" onClick={creaBozza} disabled={attesa !== null}>
                  {attesa === "jd" ? "Scrivo la bozza…" : "Crea la bozza"}
                </Bottone>
              </>
            ) : (
              <>
                {bozza ? (
                  <p className="text-sm text-muto">Bozza generata: puoi correggerla prima della pesatura.</p>
                ) : null}
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Job description
                  <textarea
                    value={jd}
                    onChange={(evento) => setJd(evento.target.value)}
                    maxLength={MAX_JD}
                    rows={8}
                    className="min-h-40 resize-y rounded-xl border border-linea px-3 py-3 text-base font-normal outline-none focus:border-accento"
                  />
                  <span className="text-xs font-normal text-muto">
                    {jd.length}/{MAX_JD}. Non inserire nomi o dati personali di dipendenti.
                  </span>
                </label>
                <Bottone type="button" onClick={pesa} disabled={attesa !== null}>
                  {attesa === "pesa" ? "Pesatura in corso…" : sbloccato ? "Aggiungi questo ruolo" : "Pesa il ruolo"}
                </Bottone>
              </>
            )}
          </div>
        </section>
      ) : null}

      {attesa ? (
        <p className="attesa rounded-2xl border border-linea bg-white px-4 py-3 text-sm" aria-live="polite">
          {messaggioAttesa}
        </p>
      ) : null}
      {errore ? (
        <p role="alert" className="rounded-2xl border border-[#f0c9c4] bg-[#fff6f5] px-4 py-3 text-sm text-[#8a2e24]">
          {errore}
        </p>
      ) : null}
      {conferma ? (
        <p role="status" className="rounded-2xl border border-[#c9e4d4] bg-[#f3fbf6] px-4 py-3 text-sm text-[#1d6b3a]">
          {conferma}
        </p>
      ) : null}

      {ruoloAttivo && !mostraModulo ? <Risultato ruolo={ruoloAttivo} /> : null}

      {!puoAggiungere && !mostraModulo ? (
        <p className="rounded-2xl border border-linea bg-white px-4 py-3 text-sm">
          Hai raggiunto i 10 ruoli di questa prova.
        </p>
      ) : null}

      {mostraGate && !mostraModulo ? (
        <section className="rounded-2xl border border-linea bg-white p-4">
          <h2 className="text-lg font-semibold">Ricevi il report e pesa fino a 10 ruoli</h2>
          <p className="mt-1 text-sm leading-5 text-muto">
            Il PDF arriva via email, così l&apos;indirizzo è quello aziendale.
          </p>
          <form
            className="relative mt-4 flex flex-col gap-3"
            onSubmit={(evento) => {
              evento.preventDefault();
              void inviaLead();
            }}
          >
            <div className="absolute -left-[10000px] h-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="hp_campo">Non compilare</label>
              <input
                id="hp_campo"
                tabIndex={-1}
                autoComplete="off"
                value={lead.honeypot}
                onChange={(evento) => setLead({ ...lead, honeypot: evento.target.value })}
              />
            </div>
            <Campo label="Nome e cognome" value={lead.nome} onChange={(nome) => setLead({ ...lead, nome })} autoComplete="name" maxLength={80} />
            <Campo label="Email aziendale" value={lead.email} onChange={(email) => setLead({ ...lead, email })} type="email" autoComplete="email" maxLength={200} />
            <Campo label="Azienda" value={lead.azienda} onChange={(azienda) => setLead({ ...lead, azienda })} autoComplete="organization" maxLength={120} />
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Numero di dipendenti
              <select
                value={lead.dipendenti}
                onChange={(evento) => setLead({ ...lead, dipendenti: evento.target.value as FasciaDipendenti | "" })}
                className="h-12 rounded-xl border border-linea bg-white px-3 text-base font-normal outline-none focus:border-accento"
              >
                <option value="">Seleziona</option>
                {FASCE_DIPENDENTI.map((fascia) => (
                  <option key={fascia} value={fascia}>
                    {fascia}
                  </option>
                ))}
              </select>
            </label>
            <Campo label="Il tuo ruolo" value={lead.ruolo} onChange={(ruolo) => setLead({ ...lead, ruolo })} autoComplete="organization-title" maxLength={120} />
            <label className="flex items-start gap-2 text-sm font-normal leading-5">
              <input
                type="checkbox"
                checked={lead.consenso}
                onChange={(evento) => setLead({ ...lead, consenso: evento.target.checked })}
                className="mt-1"
                required
              />
              <span>
                Ho letto l&apos;
                <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  informativa privacy
                </a>{" "}
                e acconsento al trattamento dei dati per ricevere il report.
              </span>
            </label>
            <Bottone type="submit" disabled={attesa !== null}>
              {attesa === "lead" ? "Invio in corso…" : "Invia il report"}
            </Bottone>
          </form>
        </section>
      ) : null}

      {sbloccato && ruoli.length > 0 ? (
        <section className="rounded-2xl border border-linea bg-white p-4">
          <h2 className="text-lg font-semibold">Ruoli per grade</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="text-muto">
                <tr>
                  <th className="py-2 font-medium">Ruolo</th>
                  <th className="py-2 text-right font-medium">Grade</th>
                  <th className="py-2 text-right font-medium">Punti</th>
                </tr>
              </thead>
              <tbody>
                {[...ruoli]
                  .sort((a, b) => b.grade - a.grade || b.totale - a.totale || a.titolo.localeCompare(b.titolo, "it"))
                  .map((ruolo) => (
                    <tr key={ruolo.id} className="border-t border-linea">
                      <td className="py-2">
                        <button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => setSelezionato(ruolo.id)}>
                          {ruolo.titolo}
                        </button>
                      </td>
                      <td className="py-2 text-right">{ruolo.grade}</td>
                      <td className="py-2 text-right">{ruolo.totale.toLocaleString("it-IT")}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {anagraficaPronta ? (
            <Bottone type="button" variante="secondario" className="mt-4" onClick={() => void inviaLead()} disabled={attesa !== null}>
              Invia di nuovo il report
            </Bottone>
          ) : null}
        </section>
      ) : null}

      {ruoloAttivo ? (
        <a
          href={CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-accento px-4 py-3 text-center text-sm font-medium text-accento"
        >
          {CTA}
        </a>
      ) : null}

      <p className="text-xs leading-5 text-muto">{DISCLAIMER}</p>
    </div>
  );
}

function Risultato({ ruolo }: { ruolo: RuoloUi }) {
  return (
    <section id="risultato" className="rounded-2xl border border-linea bg-white p-5">
      <h1 className="text-xl font-semibold tracking-tight">{ruolo.titolo}</h1>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-6xl font-semibold tracking-tight">Grade {ruolo.grade}</p>
          <p className="mt-1 text-sm text-muto">Fascia {ruolo.grade} di 12</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">{ruolo.totale.toLocaleString("it-IT")} punti</p>
          <p className="text-sm text-muto">Confidenza {etichettaConfidenza(ruolo.confidenza).toLowerCase()}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {Object.values(ruolo.fattori).map((fattore) => (
          <article key={fattore.nome} className="rounded-xl bg-carta px-3 py-3">
            <h3 className="text-sm font-semibold">
              {fattore.nome} · {fattore.punti.toLocaleString("it-IT")} punti
              {fattore.percentuale ? ` · ${fattore.percentuale}% della competenza` : ""}
            </h3>
            <ul className="mt-2 flex flex-col gap-2">
              {fattore.voci.map((voce) => (
                <li key={voce.nome} className="text-sm leading-5">
                  <span className="font-medium">
                    {voce.nome}: {voce.livello}, {voce.etichetta}
                  </span>
                  {voce.evidenza ? (
                    <span className="mt-0.5 block text-muto">«{voce.citazione}»</span>
                  ) : (
                    <span className="mt-0.5 block text-muto">Livello prudente: la JD non dà evidenza.</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm leading-5">{fattore.motivazione}</p>
          </article>
        ))}
        {ruolo.impegno ? (
          <article className="rounded-xl bg-carta px-3 py-3">
            <h3 className="text-sm font-semibold">
              Impegno · {ruolo.impegno.livello}, {ruolo.impegno.etichetta}
            </h3>
            {ruolo.impegno.evidenza ? (
              <p className="mt-2 text-sm leading-5 text-muto">«{ruolo.impegno.citazione}»</p>
            ) : (
              <p className="mt-2 text-sm leading-5 text-muto">Livello prudente: la JD non dà evidenza.</p>
            )}
            <p className="mt-2 text-sm leading-5">{ruolo.impegno.motivazione}</p>
            <p className="mt-2 text-sm leading-5 text-muto">Non entra nel punteggio Hay.</p>
          </article>
        ) : null}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-semibold">Cosa manca per una pesatura più precisa</h3>
        {ruolo.cosaManca.length > 0 ? (
          <ul className="mt-2 list-disc pl-5 text-sm leading-5 text-muto">
            {ruolo.cosaManca.map((voce) => (
              <li key={voce}>{voce}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muto">La job description copre i tre fattori e l’impegno.</p>
        )}
      </div>
    </section>
  );
}

function Campo(props: {
  label: string;
  value: string;
  onChange: (valore: string) => void;
  maxLength?: number;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {props.label}
      <input
        type={props.type ?? "text"}
        value={props.value}
        placeholder={props.placeholder}
        maxLength={props.maxLength}
        autoComplete={props.autoComplete}
        onChange={(evento) => props.onChange(evento.target.value)}
        className="h-12 rounded-xl border border-linea bg-white px-3 text-base font-normal outline-none focus:border-accento"
      />
    </label>
  );
}

function Bottone(props: {
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  variante?: "primario" | "secondario";
  className?: string;
}) {
  const variante = props.variante === "secondario"
    ? "border border-linea bg-white text-inchiostro"
    : "bg-accento text-white";
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`inline-flex h-12 items-center justify-center rounded-xl px-4 text-base font-medium disabled:opacity-60 ${variante} ${props.className ?? ""}`}
    >
      {props.children}
    </button>
  );
}

function tab(attivo: boolean): string {
  return `h-10 rounded-lg ${attivo ? "bg-white text-inchiostro shadow-sm" : "text-muto"}`;
}

function classificazioneDa(ruolo: ReportRuolo): ClassificazioneGrezza {
  const trova = (nomeFattore: keyof ReportRuolo["fattori"], nome: string) => {
    const voce = ruolo.fattori[nomeFattore].voci.find((candidata) => candidata.nome === nome);
    return {
      livello: voce?.livello ?? "A",
      citazione: voce?.citazione ?? "",
      evidenza: voce?.evidenza ?? false,
    };
  };
  return {
    competenza: {
      conoscenze: trova("competenza", "Conoscenze specialistiche"),
      ampiezzaManageriale: trova("competenza", "Ampiezza manageriale"),
      relazioni: trova("competenza", "Relazioni interpersonali"),
    },
    problemSolving: {
      libertaDiPensiero: trova("problemSolving", "Libertà di pensiero"),
      complessita: trova("problemSolving", "Complessità dei problemi"),
    },
    responsabilita: {
      autonomia: trova("responsabilita", "Autonomia decisionale"),
      dimensione: trova("responsabilita", "Dimensione economica"),
      impatto: trova("responsabilita", "Tipo di impatto"),
    },
    motivazioni: {
      competenza: ruolo.fattori.competenza.motivazione,
      problemSolving: ruolo.fattori.problemSolving.motivazione,
      responsabilita: ruolo.fattori.responsabilita.motivazione,
    },
    impegno: ruolo.impegno
      ? {
          livello: ruolo.impegno.livello,
          citazione: ruolo.impegno.citazione,
          evidenza: ruolo.impegno.evidenza,
          motivazione: ruolo.impegno.motivazione,
        }
      : {
          livello: "1",
          citazione: "",
          evidenza: false,
          motivazione: "La job description non descrive l'impegno richiesto.",
        },
    cosaManca: ruolo.cosaManca,
  } as ClassificazioneGrezza;
}

async function chiama<T>(url: string, body: unknown): Promise<T> {
  let risposta: Response;
  try {
    risposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Connessione interrotta. Controlla la rete e riprova.");
  }
  const dati = (await risposta.json().catch(() => ({}))) as { errore?: string };
  if (!risposta.ok) {
    throw new Error(dati.errore || "Qualcosa non ha funzionato. Riprova.");
  }
  return dati as T;
}

function messaggioDi(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Qualcosa non ha funzionato. Riprova.";
}
