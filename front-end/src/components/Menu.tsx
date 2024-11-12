import { Button } from '@headlessui/react';
import {
  IconArrowsUpDown,
  IconHome,
  IconPackage,
  IconReportAnalytics,
  IconSettings,
} from '@tabler/icons-react';
import Link from 'next/link';

export const Menu: React.FC = () => {
  return (
    <div className="bg-neutral-50 h-full px-5 py-5 shadow-inner">
      <div className="text-xl font-bold pt-0.5">MySaaS.com</div>
      <ul className="mt-9 text-sm flex flex-col gap-2">
        <Link href="/">
          <Button className="hover:bg-[#eaeaea] py-1 px-2 w-full flex items-center gap-4 rounded-sm">
            <IconHome size={16} />
            Home
          </Button>
        </Link>
        <Link href="/">
          <Button className="hover:bg-[#eaeaea] py-1 px-2 w-full flex items-center gap-4 rounded-sm">
            <IconPackage size={16} />
            Products
          </Button>
        </Link>
        <Link href="/">
          <Button className="hover:bg-[#eaeaea] py-1 px-2 w-full flex items-center gap-4 rounded-sm">
            <IconReportAnalytics size={16} />
            Reports
          </Button>
        </Link>
        <Link href="/">
          <Button className="hover:bg-[#eaeaea] py-1 px-2 w-full flex items-center gap-4 rounded-sm">
            <IconArrowsUpDown size={16} />
            Balances
          </Button>
        </Link>
        <Link href="/">
          <Button className="bg-[#eaeaea] py-1 px-2 w-full flex items-center gap-4 rounded-sm">
            <IconSettings size={16} />
            Team Settings
          </Button>
        </Link>
      </ul>
    </div>
  );
};
