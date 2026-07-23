import { useEffect, useState } from "react";


const API =
 import.meta.env.VITE_API_URL ?? "http://localhost:8080";



export function App(){


 const [user,setUser] = useState<any>(null);
 const [loading,setLoading] = useState(true);



 useEffect(()=>{


  fetch(`${API}/auth/me`,{
    credentials:"include"
  })

  .then(res=>{

    if(!res.ok)
      throw new Error();

    return res.json();

  })

  .then(data=>{

    setUser(data);

  })

  .catch(()=>{

    setUser(null);

  })

  .finally(()=>{

    setLoading(false);

  });


 },[]);



 const login = ()=>{

   window.location.href =
   `${API}/auth/google`;

 };



 const logout = async()=>{


   await fetch(`${API}/auth/logout`,{

     method:"POST",
     credentials:"include"

   });


   setUser(null);

 };




 if(loading){

   return <h2>Loading...</h2>

 }



 return (

 <main>


 <h1>
 TalentMatch
 </h1>



 {
 user ? (

   <div>

    <img
      src={user.avatar_url}
      width="60"
    />


    <h2>
      Welcome {user.name}
    </h2>


    <p>
      {user.email}
    </p>



    <button onClick={logout}>
      Logout
    </button>


   </div>


 ) : (


   <button onClick={login}>

      Sign in with Google

   </button>


 )

 }



 </main>

 )


}