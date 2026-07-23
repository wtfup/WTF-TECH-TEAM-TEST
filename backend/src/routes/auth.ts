import { Router } from "express";
import passport from "../auth/passport";
import { env } from "../env";

const router = Router();


router.get(
 "/google",
 passport.authenticate("google",{
  scope:["profile","email"]
 })
);


router.get(
 "/google/callback",
 passport.authenticate("google",{
  failureRedirect:"/login"
 }),
 (_req,res)=>{
   res.redirect(env.frontendUrl);
 }
);


router.post("/logout",(req,res)=>{

 req.logout(()=>{
   res.json({
    message:"Logged out"
   });
 });

});


router.get("/me",(req,res)=>{

 if(!req.user){
   return res.status(401).json({
    message:"Not authenticated"
   });
 }

 res.json(req.user);

});


export default router;