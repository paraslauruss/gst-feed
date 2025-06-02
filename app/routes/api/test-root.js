import { json } from "@remix-run/node";

export const loader = async () => {

    return json({ message: "Root test route is working!" });

};