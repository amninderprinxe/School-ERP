import { redirect } from "next/navigation";

export default function Home() {
  // Je user login hai taan dashboard te bhej do, nahi taan login page te
  redirect("/login"); 
}