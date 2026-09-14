let's keep it a web app for now. it's the easyest for debugging and i dont thinkt the button and bars are worth it anymore.

all 8 stats seem good or interesting
- how do we make sure it doesnt become a total mess of metrics everywhere?

put the DB volume in project folders instead of a named volume (to be sure and to use as a backup)

i read/scanned your differences between the book and the generator, and i think they all should be adressed and added. it will be a lot to change, but i think its very worth it, because otherwise i will just not be learning something crucial.

then, for the difficulty (since we're already overhauling the generators), i want you to replace the slider with just 3 different levels (so each generator can strive to be simmilarely difficult). the slider isnt working, since it's just unclear and you put hard-coded checks in the code anyway to determine how hard to generate. so, just make 3 difficulty levels, and base the generators off of that. easy, medium, hard. and dont make easy so easy that a todler can do it, because it still needs to be challenging. and for hard i want hard questions, where i scratch my head, but with training i should be able to start seeing patterns in them and have a better idea how to solve them quickly. let's say that you have to strive for the difficulty that is in the practice exams in `~/Downloads/calc-practice-exams`. because that is **THE** endgoal.

If the backend did not answer/rejected the token, show the same popup you show for updating the app and make it dismissable (in case that component isn't)

add limits to the generators. make it available under the next chapter number (i think the last one in the book is 12-vectors. if that's the case, use 13)

i want more variation in the combination of different chapters. When multiple chapters are selected and sufficiently high difficulty, try to generate questions that use multiple (doesnt have to be all) of those selected chapters, to make them require more thinking steps and to really challenge to think.

upgrade the existing generators also with these homework tasks that i got in `~/Downloads/calc-assignments`

also: im done with the design for graphs and vectors. the file is available in `docs/claudes_plan/claude_design_mockup`. there are some details that it got wrong about the currently standing design (like the way the input fields look), but looking past those details, this is what i had in mind, so try to follow it closely, but be aware that i might not have seen every mistake...