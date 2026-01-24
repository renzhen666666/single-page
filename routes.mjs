


export default [    
    { 
        path: '/route/:q<int>',
        template: {
            path: '/route',
            params: {
                query: 'q'
            }
        },
        function: {
            target: (q) => {console.log(q)},
            params: {
                q: 'q'
            }
        }
    },
]