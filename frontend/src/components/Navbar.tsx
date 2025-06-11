import { Link } from 'react-router-dom';
import mouseLogo from '@/assets/mouse.png';

const navigation = [
  { name: 'Providers', href: '/providers' },
  { name: 'News', href: '/news' },
  { name: 'Documentation', href: '/docs' },
];

export function Navbar() {
  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center">
          {/* Logo */}
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <img src={mouseLogo} alt="Mouse Logo" className="h-6 w-6" />
            <span className="font-bold text-lg hidden sm:inline-block">Mouse</span>
          </Link>
          
          {/* Navigation Links */}
          <div className="flex flex-1 items-center space-x-6 text-sm">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}