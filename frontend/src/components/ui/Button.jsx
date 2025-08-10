// frontend/src/components/ui/Button.jsx

import React from 'react'; // Certifique-se de importar React se usar JSX

// Exemplo de como Button.jsx deve exportar o componente
// para que 'import { Button } from ...' funcione.
export function Button({ children, className = '', ...props }) {
    return (
        <button
            className={`px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

// Se o seu Button.jsx for mais complexo ou usar forwardRef, pode ser assim:
// import React from 'react';
// import { forwardRef } from 'react';

// export const Button = forwardRef(({ children, className = '', ...props }, ref) => {
//     return (
//         <button
//             ref={ref}
//             className={`px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 ${className}`}
//             {...props}
//         >
//             {children}
//         </button>
//     );
// });
// Button.displayName = "Button"; // Boa prática para componentes com forwardRef
