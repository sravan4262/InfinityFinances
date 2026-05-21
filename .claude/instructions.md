don't worry about creating a separate migration file, just place everything under where the tables exist, no need of cleaning up data, it's still in my local for now

put all retirement migrations in one file and same for home and budget calc and chat
absolutelty no triggers at all

any change to web or mobile ui, it should be made on both sides

don't run builds after every change, once all the changes are done in a session or when working on a feature or an md guide, at the end run the build and typescript checks

once features are being completed from a guide update the guide with status

for every change , first plan and tell me , for planning just give me simple examples that's it, don't give so much stuff

make sure that any changed being done are prod ready, not just tweaking so that it will work in local