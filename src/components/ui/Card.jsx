import './Card.css';

export default function Card({ children, className = '', hover = true, ...props }) {
  return (
    <div className={`card glass-card ${hover ? 'card-hover' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}
