export default function Input({ value, onChange, placeholder, required }) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}