import { Navbar } from './Navbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Navbar />
      {children}
    </div>
  );
}
