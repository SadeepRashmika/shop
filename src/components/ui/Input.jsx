import './Input.css';

export default function Input({
  label,
  icon,
  error,
  id,
  type = 'text',
  ...props
}) {
  return (
    <div className={`input-group ${error ? 'input-error' : ''}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          id={id}
          type={type}
          className={`input-field ${icon ? 'has-icon' : ''}`}
          {...props}
        />
      </div>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}
