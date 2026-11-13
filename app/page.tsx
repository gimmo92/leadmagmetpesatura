import { Pesatura } from "./pesatura";

export default function Page() {
  return <Pesatura privacyUrl={process.env.PRIVACY_URL || "https://tryspark.co"} />;
}
