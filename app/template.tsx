'use client';

import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.2,
        ease: [0.16, 1, 0.3, 1]
      }}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        flex: 1, 
        width: '100%',
        minHeight: '100vh',
        transform: 'translateZ(0)',
        willChange: 'opacity, transform'
      }}
    >
      {children}
    </motion.div>
  );
}
