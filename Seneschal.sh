#If already running, just open the browser
if ss -ltnp | grep -w ':5173'; then
	echo Seneschal is already running. Opening browser...
	xdg-open "http://localhost:5173"
	exit 0
fi

# Start Seneschal
echo "Starting Seneschal PF2E GM Assistant..."
npm run dev
sleep 1
if ss -ltnp | grep -w ':5173'; then
	echo "Seneschal is running - http://localhost:5173"
	echo "Close this window to stop the server."
else
	echo "Seneschal failed to start."
	exit 1
fi

# Open browser 3 seconds after server starts
sleep 3
echo "Opening browser."
xdg-open "http://localhost:5173"
