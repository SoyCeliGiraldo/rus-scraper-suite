-- Apple Receipt Extraction Script v3 (Inbox + October filter)
-- Scans Inbox messages where:
--   sender contains "no_reply@email.apple.com"
--   AND date is in October (current year)
-- Extracts: order_id, document, apple_account, card_last4, total_amount, email_subject, email_date
-- Writes JSON array to:
--   /Users/mikehabib/amazon-invoice-bot/MacMail_Tool/Apple Receipt/data/output/apple_receipts.json

on run
	display dialog "Apple Receipt Extractor v3 is runningÉ" buttons {"OK"} default button "OK"
	
	-- === CONFIG ===
	set outputDir to "/Users/mikehabib/amazon-invoice-bot/MacMail_Tool/Apple Receipt/data/output"
	set outputFilePath to outputDir & "/apple_receipts.json"
	set allowedSenderFragment to "no_reply@email.apple.com"
	
	-- Ensure output folder exists
	do shell script "mkdir -p " & quoted form of outputDir
	
	set jsonItems to {}
	set nowYear to year of (current date)
	
	tell application "Mail"
		-- Get ALL messages in Inbox (we'll filter in AppleScript)
		set theMessages to messages of inbox
		
		repeat with m in theMessages
			set theSender to sender of m
			
			-- Filter by Apple sender
			if theSender contains allowedSenderFragment then
				set theDate to date sent of m
				-- Filter by October in current year
				if (year of theDate is nowYear and month of theDate is October) then
					set theSubject to subject of m
					set theBody to content of m as string
					
					set orderID to ""
					set docNumber to ""
					set appleAccount to ""
					set cardLast4 to ""
					set amountString to ""
					
					set bodyLines to paragraphs of theBody
					set lineCount to count of bodyLines
					
					repeat with i from 1 to lineCount
						set lineText to item i of bodyLines as rich text
						
						if lineText starts with "Order ID:" then
							set orderID to my trimText(rich text ((length of "Order ID:") + 1) thru -1 of lineText)
						else if lineText starts with "Document:" then
							set docNumber to my trimText(rich text ((length of "Document:") + 1) thru -1 of lineText)
						else if lineText starts with "Apple Account:" then
							set appleAccount to my trimText(rich text ((length of "Apple Account:") + 1) thru -1 of lineText)
						else if lineText contains "American Express ¥¥¥¥" then
							-- Typical Apple receipt layout:
							-- Line i:   "American Express ¥¥¥¥"
							-- Line i+1: "1001"   (last 4 digits)
							-- Line i+2: "$53.09" (amount)
							if (i + 1) ² lineCount then
								set cardLast4 to my trimText(item (i + 1) of bodyLines as rich text)
							end if
							if (i + 2) ² lineCount then
								set amountString to my trimText(item (i + 2) of bodyLines as rich text)
							end if
						end if
					end repeat
					
					-- Clean up amount: "$53.09" -> "53.09"
					set numericAmount to my stripCurrency(amountString)
					
					-- Build JSON object string for this email
					set jsonObject to my makeJsonObject(orderID, docNumber, numericAmount, cardLast4, appleAccount, theSubject, theDate)
					if jsonObject is not "" then
						set end of jsonItems to jsonObject
					end if
				end if
			end if
		end repeat
	end tell
	
	-- Join objects into a JSON array
	set LF to (ASCII character 10)
	set jsonText to "[" & my joinList(jsonItems, "," & LF) & "]"
	
	-- Write to the fixed path
	do shell script "printf %s " & quoted form of jsonText & " > " & quoted form of outputFilePath
	
	display dialog "Apple Receipts extraction complete." & return & "Messages processed: " & (count of jsonItems) & return & "Output file:" & return & outputFilePath buttons {"OK"} default button "OK"
end run


-- =========================
-- Helper handlers
-- =========================

on trimText(t)
	set t to t as text
	set whiteChars to {" ", tab, return, linefeed}
	
	if t is "" then return ""
	
	-- Trim leading whitespace
	repeat while t is not "" and whiteChars contains character 1 of t
		set t to text 2 thru -1 of t
		if t is "" then exit repeat
	end repeat
	
	if t is "" then return ""
	
	-- Trim trailing whitespace
	repeat while t is not "" and whiteChars contains character -1 of t
		if (length of t) is 1 then
			set t to ""
			exit repeat
		else
			set t to text 1 thru -2 of t
		end if
	end repeat
	
	return t
end trimText

on stripCurrency(a)
	set a to my trimText(a)
	if a is "" then return ""
	
	-- Remove $ and commas
	set AppleScript's text item delimiters to {"$", ","}
	set parts to text items of a
	set AppleScript's text item delimiters to ""
	set cleaned to parts as text
	
	return my trimText(cleaned)
end stripCurrency

on escapeJsonString(t)
	set t to t as text
	
	-- Escape backslashes first
	set AppleScript's text item delimiters to "\\"
	set parts0 to text items of t
	set AppleScript's text item delimiters to "\\\\"
	set t to parts0 as text
	
	-- Escape double quotes
	set AppleScript's text item delimiters to "\""
	set parts to text items of t
	set AppleScript's text item delimiters to "\\\""
	set t to parts as text
	
	-- Replace line breaks with \n
	set AppleScript's text item delimiters to {return, linefeed}
	set parts2 to text items of t
	set AppleScript's text item delimiters to "\\n"
	set t to parts2 as text
	
	set AppleScript's text item delimiters to ""
	return t
end escapeJsonString

on formatDateForJson(d)
	-- Use the default AppleScript date string and escape it
	set ds to d as string
	set ds to my escapeJsonString(ds)
	return ds
end formatDateForJson

on makeJsonObject(orderID, docNumber, amountText, cardLast4, appleAccount, subj, theDate)
	-- If we have neither order ID nor document, skip this email
	if orderID is "" and docNumber is "" then
		return ""
	end if
	
	set eOrder to my escapeJsonString(orderID)
	set eDoc to my escapeJsonString(docNumber)
	set eAcc to my escapeJsonString(appleAccount)
	set eSub to my escapeJsonString(subj)
	set eDate to my formatDateForJson(theDate)
	set eCard to my escapeJsonString(cardLast4)
	
	set jsonText to "{"
	set jsonText to jsonText & "\"order_id\":\"" & eOrder & "\","
	set jsonText to jsonText & "\"document\":\"" & eDoc & "\","
	set jsonText to jsonText & "\"apple_account\":\"" & eAcc & "\","
	set jsonText to jsonText & "\"card_last4\":\"" & eCard & "\","
	set jsonText to jsonText & "\"email_subject\":\"" & eSub & "\","
	set jsonText to jsonText & "\"email_date\":\"" & eDate & "\""
	
	if amountText is not "" then
		set jsonText to jsonText & ",\"total_amount\":" & amountText
	end if
	
	set jsonText to jsonText & "}"
	return jsonText
end makeJsonObject

on joinList(theList, theDelimiter)
	if (count of theList) is 0 then return ""
	set outText to item 1 of theList
	if (count of theList) > 1 then
		repeat with i from 2 to count of theList
			set outText to outText & theDelimiter & item i of theList
		end repeat
	end if
	return outText
end joinList