'use client';

import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        type: 'spring',
        stiffness: 260,
        damping: 20,
        mass: 0.5
      }}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        flex: 1, 
        width: '100%',
        minHeight: '100vh'
      }}
    >
      {children}
    </motion.div>
  );
}
