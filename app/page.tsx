import { PRIVACY_URL } from "@/lib/costanti";
import { Pesatura } from "./pesatura";

export default function Page() {
  return <Pesatura privacyUrl={process.env.PRIVACY_URL || PRIVACY_URL} />;
}
