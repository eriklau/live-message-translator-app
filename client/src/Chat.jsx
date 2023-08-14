import { useState, useEffect, useContext } from "react";
import { UserContext } from "./UserContext";
import { uniqBy } from "lodash";
import axios from "axios";

export default function Chat() {
    const [ws, setWs] = useState(null);
    const [onlinePeople, setOnlinePeople] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);
    const {username, id, setId, setUsername} = useContext(UserContext);
    const [newMessage, setNewMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [selectedUserPreferredLanguage, setSelectedUserPreferredLanguage] = useState(null);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:4000');
        setWs(ws);
        ws.addEventListener('message', handleMessage)
    }, []);

    function showOnlinePeople(peopleArray) {
        const people = {};
        peopleArray.forEach(({userId, username}) => {
            people[userId] = username;
        });
        setOnlinePeople(people);
    }

    async function fetchUserData(userId) {
        try {
          const response = await axios.get(`http://localhost:4000/user/${userId}`);
          const userData = response.data;
          setSelectedUserPreferredLanguage(userData.preferredLanguage);
        } catch (error) {
          console.error(error);
        }
    }

    function handleUserSelect(userId) {
        setSelectedUserId(userId);
        // Fetch user information and set the preferred language
        fetchUserData(userId);
      }

    function handleMessage(e) {
        const messageData = JSON.parse(e.data);
        console.log({e, messageData});
        
        if ('online' in messageData) {
            showOnlinePeople(messageData.online);
        } else if ('text' in messageData) {
            setMessages(prev => ([...prev, {...messageData}]));
        }

    }

    async function sendMessage(e) {
        e.preventDefault();

        ws.send(JSON.stringify({
            recipient: selectedUserId,
            text: newMessage,
        }));
        setNewMessage('');
        setMessages(prev => ([...prev, {
            text: newMessage, 
            sender: id,
            recipient: selectedUserId,
            id: Date.now(),
        }]));
    }

    function logout() {
        axios.post('/logout').then(() => {
            setId(null);
            setUsername(null);
        })
    }

    const onlineUsersExceptSelf = {...onlinePeople};
    delete onlineUsersExceptSelf[id];

    const messagesNoDupes = uniqBy(messages, 'id');

    return (
        <div className="flex h-screen">
            <div className="flex flex-col bg-green-50 w-3/4">
                <div className="flex-grow">
                    {!selectedUserId && (
                        <div className="text-9xl text-right mt-16 p-2 mb-1 py-4 pb-10">☛</div>
                    )}
                    {!!selectedUserId && (
                        <div className="overflow-y-scroll">
                            {messagesNoDupes.map(message => (
                                <div className={message.sender === id ? 'text-right' : 'text-left'}>
                                    <div className={"text-left inline-block p-4 my-4 rounded-md " + (message.sender === id ? 'bg-green-400 text-white' : 'bg-gray-400 text-white')}>
                                        {console.log(message)}
                                        {message.sender === id ? (
                                            // For the sender's own messages, show the original text
                                            message.text
                                        ) : (
                                            // For recipient's messages, display the translated text if available
                                            message.translatedText || message.text
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {!!selectedUserId && (
                    <form className="flex mx-4 p-2" onSubmit={sendMessage}>
                        <input 
                            type="text" 
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder="Message here" 
                            className="flex-grow bg-grey-50 rounded-sm" 
                            border="p-4"
                        />
                        <button type="submit" className="bg-green-200 p-4 rounded-sm">
                            🗨️
                        </button>
                    </form>
                )}
            </div>
            <div className="bg-green-100 w-1/4 p-4">

                <div className="text-5xl p-2 mb-1 border-b border-blue-200 py-4 pb-10">
                    👋
                </div>

                {Object.keys(onlineUsersExceptSelf).map(userId => (
                    <div 
                        key={userId}
                        onClick={() => 
                            handleUserSelect(userId)} 
                        className={"border-b border-blue-200 py-4 " + (userId === selectedUserId ? 'bg-green-200' : '')}>
                            {onlinePeople[userId]}
                    </div>
                ))}

                <div className="p-4 text-center">
                    <span className="m-2 text-md text-gray">{username}</span>
                    <button 
                        onClick={logout}
                        className="bg-green-200 p-3 rounded-md">
                        LOG OUT
                    </button>
                </div>
            </div>
        </div>
    );
}