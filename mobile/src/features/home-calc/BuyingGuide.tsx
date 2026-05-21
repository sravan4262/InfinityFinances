import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/theme/ThemeProvider";

const STEPS = [
  ["Check Your Credit & Finances", "Pull your credit report, check your score, and resolve errors before applying."],
  ["Set a Realistic Budget", "Use 28/36 DTI as a ceiling, then add taxes, insurance, maintenance, and HOA."],
  ["Save for Down Payment & Closing Costs", "Aim for 20% down if possible, plus 2-5% for closing costs."],
  ["Get Pre-Approved", "A pre-approval letter shows sellers you are serious and ready to borrow."],
  ["Find a Buyer's Agent", "A good agent represents your interests and knows the local market."],
  ["Search for Homes", "Separate must-haves from nice-to-haves before touring."],
  ["Make an Offer", "Include price, contingencies, and earnest money."],
  ["Schedule Inspection", "Inspect structure, roof, systems, water risk, and appliances."],
  ["Secure Final Approval", "Keep finances stable until underwriting clears the loan."],
  ["Close on Your Home", "Sign documents, pay cash due, and receive the keys."]
];

const KEY_NUMBERS = [
  ["20%", "Ideal down payment"],
  ["28/36", "Conservative DTI"],
  ["620+", "Common minimum score"],
  ["2-5%", "Closing costs"],
  ["1%", "Annual maintenance"],
  ["3-6 mo", "Emergency fund"],
  ["3.5%", "FHA min down"],
  ["5 yrs", "Typical horizon"]
];

const GLOSSARY = [
  ["APR", "True yearly borrowing cost including interest and fees."],
  ["DTI", "Monthly debt obligations divided by gross monthly income."],
  ["LTV", "Loan amount divided by appraised value."],
  ["PMI", "Insurance usually required below 20% down."],
  ["Escrow", "Account for property taxes and insurance."],
  ["Contingency", "A contract condition such as inspection, financing, or appraisal."]
];

const TIPS = [
  "Do not buy to the bank's maximum approval.",
  "Get pre-approved before house hunting.",
  "Shop at least three lenders.",
  "Visit the neighborhood at different times.",
  "Look past cosmetics; inspect expensive risks.",
  "Think about resale before you buy."
];

const MISTAKES = [
  "Waiving the home inspection.",
  "Buying at your pre-approval ceiling.",
  "Making large purchases before closing.",
  "Underestimating maintenance costs.",
  "Using only one lender.",
  "Ignoring HOA rules and finances."
];

export function BuyingGuide() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <Header title="The 10-Step Buying Process" body="From listings to keys." />
        {STEPS.map(([title, body], index) => (
          <View key={title} style={styles.stepRow}>
            <View style={styles.stepDot}><Text style={styles.stepDotText}>{index + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{title}</Text>
              <Text style={styles.itemBody}>{body}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card style={styles.card}>
        <Header title="Key Numbers to Know" body="Benchmarks lenders and buyers keep coming back to." />
        <View style={styles.numberGrid}>
          {KEY_NUMBERS.map(([value, label]) => (
            <View key={label} style={styles.numberCard}>
              <Text style={styles.numberValue}>{value}</Text>
              <Text style={styles.numberLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Header title="Key Terms Glossary" body="Words to understand before signing anything." />
        {GLOSSARY.map(([term, definition]) => (
          <View key={term} style={styles.termRow}>
            <Text style={styles.itemTitle}>{term}</Text>
            <Text style={styles.itemBody}>{definition}</Text>
          </View>
        ))}
      </Card>

      <Card style={styles.card}>
        <Header title="First-Time Buyer Tips" body="Advice that saves money and avoids regret." />
        {TIPS.map((tip) => <Bullet key={tip} text={tip} color={colors.success} />)}
      </Card>

      <Card style={styles.card}>
        <Header title="Common Mistakes to Avoid" body="Errors that can cost thousands or kill the deal." />
        {MISTAKES.map((mistake) => <Bullet key={mistake} text={mistake} color={colors.destructive} />)}
      </Card>

      <Text style={styles.disclaimer}>Planning tool only - not financial, tax, or legal advice.</Text>
    </View>
  );
}

function Header({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 3 }}>
      <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>{title}</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 17 }}>{body}</Text>
    </View>
  );
}

function Bullet({ text, color }: { text: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 9, alignItems: "flex-start" }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, marginTop: 7 }} />
      <Text style={{ color: colors.mutedForeground, lineHeight: 20, flex: 1 }}>{text}</Text>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  card: { gap: 12 },
  disclaimer: { color: colors.mutedForeground, fontSize: 11, lineHeight: 16, textAlign: "center" },
  itemBody: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17, marginTop: 2 },
  itemTitle: { color: colors.foreground, fontSize: 13, fontWeight: "900" },
  numberCard: { alignItems: "center", backgroundColor: colors.cardElevated, borderColor: colors.border, borderRadius: 10, borderWidth: 1, flexBasis: "47%", flexGrow: 1, gap: 3, padding: 10 },
  numberGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  numberLabel: { color: colors.mutedForeground, fontSize: 10, fontWeight: "800", textAlign: "center", textTransform: "uppercase" },
  numberValue: { color: colors.primary, fontSize: 19, fontWeight: "900" },
  stepDot: { alignItems: "center", backgroundColor: colors.primaryWash, borderColor: colors.primary, borderRadius: 13, borderWidth: 1, height: 26, justifyContent: "center", width: 26 },
  stepDotText: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  stepRow: { alignItems: "flex-start", borderColor: colors.border, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 10, padding: 10 },
  termRow: { borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: 10 },
  wrap: { gap: 12, marginTop: 16 }
});
