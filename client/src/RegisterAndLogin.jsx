import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "./UserContext";

export default function RegisterAndLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginOrRegister, setIsLoginOrRegister] = useState('register');
    const [preferredLanguage, setPreferredLanguage] = useState('');
    const {setUsername:setLoggedInUsername, setId} = useContext(UserContext);

    async function handleSubmit(e) {
        e.preventDefault()
        const url = isLoginOrRegister === 'register' ? 'register' : 'login'

        console.log(url);

        if (url === 'register') {
            const {data} = await axios.post(url, {username, password, preferredLanguage});
            setLoggedInUsername(username);
            setId(data.id);
        } else if (url === 'login') {
            const {data} = await axios.post(url, {username, password});
            setLoggedInUsername(username);
            setId(data.id);
        }
    }

    return (
        <div className="bg-green-50 h-screen flex items-center">
            <form className="w-64 mx-auto mb-12" onSubmit={handleSubmit}>
                <input 
                    value={username} 
                    onChange={e => setUsername(e.target.value)}
                    type="text" 
                    placeholder="username" 
                    className="block w-full rounded-sum p-2 mb-2 border" 
                />
                <input 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    type="password" 
                    placeholder="password" 
                    className="block w-full rounded-sum p-2 mb-2 border" 
                />

                {isLoginOrRegister === 'register' && (
                    <input 
                        value={preferredLanguage} 
                        onChange={e => setPreferredLanguage(e.target.value)}
                        type="text" 
                        placeholder="Preferred Language" 
                        className="block w-full rounded-sum p-2 mb-2 border" 
                    />
                )}

                <button className="bg-green-400 text-white block w-full rounded-sm p-2">
                    {isLoginOrRegister === 'register' ? 'Register' : 'Login'}
                </button>

                <div className="text-center mt-4">
                    {isLoginOrRegister === 'register' && (
                        <div>
                            <button className="bg-blue-400 text-white block w-full rounded-sm p-2" onClick={() => setIsLoginOrRegister('login')}>
                                Login here
                            </button>
                        </div>
                    )}
                    {isLoginOrRegister === 'login' && (
                        <div>
                            <button className="bg-blue-400 text-white block w-full rounded-sm p-2" onClick={() => setIsLoginOrRegister('register')}>
                                Register here
                            </button>
                        </div>
                    )}
                </div>

            </form>
        </div>
    )
}