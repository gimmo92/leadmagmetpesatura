import { Document, Image, Link, Page, StyleSheet, Text, View, Font } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { CALENDLY_URL, DISCLAIMER } from "./costanti";
import { etichettaConfidenza } from "./etichette";
import type { ReportRuolo } from "./classificazione";

Font.registerHyphenationCallback((parola) => [parola]);

const stili = StyleSheet.create({
  pagina: { padding: 36, fontSize: 10, color: "#202020", fontFamily: "Helvetica" },
  logo: { width: 118, height: 53, marginBottom: 12 },
  kicker: { fontSize: 9, color: "#418CE9", marginBottom: 4, textTransform: "uppercase" },
  titolo: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  meta: { fontSize: 10, color: "#5e6673", marginBottom: 16 },
  tabella: { borderWidth: 1, borderColor: "#e1e5ee", borderRadius: 6, marginBottom: 18 },
  riga: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e1e5ee" },
  cella: { paddingVertical: 6, paddingHorizontal: 8, flexGrow: 1 },
  cellaStretta: { paddingVertical: 6, paddingHorizontal: 8, width: 70, textAlign: "right" },
  testata: { backgroundColor: "#f3f6fb", fontFamily: "Helvetica-Bold" },
  ruolo: { marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#eef1f6" },
  ruoloTitolo: { fontFamily: "Helvetica-Bold", fontSize: 12, marginBottom: 2 },
  fattore: { marginTop: 4 },
  fattoreNome: { fontFamily: "Helvetica-Bold" },
  muto: { color: "#5e6673" },
  bottone: {
    marginTop: 16,
    backgroundColor: "#418CE9",
    color: "#ffffff",
    textDecoration: "none",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    fontFamily: "Helvetica-Bold",
    alignSelf: "flex-start",
  },
  disclaimer: { marginTop: 14, fontSize: 8, color: "#5e6673", lineHeight: 1.4 },
});

export function creaReportPdf(props: {
  logo: { data: Buffer; format: "png" } | null;
  azienda: string;
  data: string;
  ruoli: ReportRuolo[];
}): ReactElement<DocumentProps> {
  return (
    <Document title="Pesatura ruoli" author="Spark">
      <Page size="A4" style={stili.pagina}>
        {props.logo ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image non supporta alt
          <Image src={props.logo} style={stili.logo} />
        ) : (
          <Text style={stili.titolo}>Spark</Text>
        )}
        <Text style={stili.kicker}>Spark</Text>
        <Text style={stili.titolo}>Pesatura dei ruoli</Text>
        <Text style={stili.meta}>
          {props.azienda} · {props.data}
        </Text>
        <View style={stili.tabella}>
          <View style={[stili.riga, stili.testata]}>
            <Text style={stili.cella}>Ruolo</Text>
            <Text style={stili.cellaStretta}>Grade</Text>
            <Text style={stili.cellaStretta}>Punti</Text>
          </View>
          {props.ruoli.map((ruolo, indice) => (
            <View key={`riga-${indice}`} style={stili.riga}>
              <Text style={stili.cella}>{ruolo.titolo}</Text>
              <Text style={stili.cellaStretta}>{ruolo.grade}</Text>
              <Text style={stili.cellaStretta}>{ruolo.totale}</Text>
            </View>
          ))}
        </View>
        {props.ruoli.map((ruolo, indice) => (
          <View key={`dettaglio-${indice}`} style={stili.ruolo}>
            <Text style={stili.ruoloTitolo}>
              {ruolo.titolo} · grade {ruolo.grade} · {ruolo.totale} punti
            </Text>
            <Text style={stili.muto}>Confidenza {etichettaConfidenza(ruolo.confidenza).toLowerCase()}</Text>
            {Object.values(ruolo.fattori).map((fattore) => (
              <View key={fattore.nome} style={stili.fattore}>
                <Text style={stili.fattoreNome}>
                  {fattore.nome} · {fattore.punti} punti
                  {fattore.percentuale ? ` (${fattore.percentuale}% della competenza)` : ""}
                </Text>
                <Text>
                  {fattore.voci
                    .map((voce) => `${voce.nome}: ${voce.livello}, ${voce.etichetta}`)
                    .join(" · ")}
                </Text>
                <Text>{fattore.motivazione}</Text>
              </View>
            ))}
            <View style={stili.fattore}>
              <Text style={stili.fattoreNome}>
                Impegno · {ruolo.impegno.livello}, {ruolo.impegno.etichetta}
              </Text>
              <Text>{ruolo.impegno.motivazione}</Text>
              <Text style={stili.muto}>Non entra nel punteggio Hay.</Text>
            </View>
            {ruolo.cosaManca.length > 0 ? (
              <Text style={stili.muto}>Cosa manca: {ruolo.cosaManca.join(" ")}</Text>
            ) : null}
          </View>
        ))}
        <Link src={CALENDLY_URL} style={stili.bottone}>
          Prenota una demo
        </Link>
        <Text style={stili.disclaimer}>{DISCLAIMER}</Text>
      </Page>
    </Document>
  );
}
