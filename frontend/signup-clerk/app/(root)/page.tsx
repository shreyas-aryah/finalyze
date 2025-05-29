import { UserButton } from "@clerk/nextjs";

export default function Home() {
  return <>
  <div className="flex items-center justify-around p-5">
    <div>
      <h1>Finalyze</h1>
    </div>
    <div>
      <UserButton afterSignOutUrl="/" />
    </div>
  </div>
  </>
}
