when using undo on a question with vectors, all vectors are first removed before drawings, regardless of the order in which they where drawd... (for example when i draw the vector, then write some text with the actual pen tool, then press undo: the vector gets removed. press undo again: the pen gets removed. press redo: the VECTOR GETS REDONE, redo again and the pen is redone...)

i want to be able to fine tune the topics i actually get by tapping on "11 topics ask this" text, which should show those topics and then i can toggle each. (for example, when i dont want to have lhospitals rule yet, or another case where i ONLY want that. actually, in the case i only want lhospital i might still want the other rules, but i just want to force lhospital to show up in each. so basically i want to be able to filter out certain topics, and to force certain topics.) when this is changed, save that but also show an indicator next to that topics text. so next time i want to practice that, it has the same settings, but i can see if there are special settings applied and then i can quickly reset it for example when i just want all rules again.

now the actual input for the latex in canvas is stuck halfway the page when i focus it... just like the key bar used to be (which is now kind of sticky, though it's not perfectly to the top of the keyboard)
- I'm thinking that the page just handles the keyboard wrong. because when the keyboard is focussed, the whole page stays the same height but it shifts up, causing it to be scrollable in a weird and (seemingly) undeterministic way (it's just hard to predict if it will scroll or not... if you know what i mean). To fix this, i think we should just always make sure that the page resizes to fit into the portion of the screen that's still visible when showing the keyboard? then you also dont have to do these tricks to get the key bar to be at the exact right position all the time...

when syncing to upload settings, it just says "already synced" but when retrieving settings on another device it says settings updated. make sure that the settings uploaded is also a response.

when sliding out the hints menu on tablet, the shadow will show while it's transitioning out, and when the div is off-screen it will just pop out of existance, but the shadow was still onscreen, so i want the shadow to also fade out while the hint menu is sliding out of frame.

when in fullscreen canvas mode, i want the canvas go go on beneath the top bar and the bottom buttons. make the topbar slightly frosted, and do the same for the backdrop of the buttons (so their parent element is frosted). make that button element smoothly transition frost, like below the buttons the effect is full, but above them it eases out.
- the input can also be frosted, but only if inplementing it for the input is easy.

"the read" says: "chapter 9 is 94% faster than it was, at 13% right. that one is turning into fluency."... now i admit that i have been using this chapter to quickly go to the endscreen a few times by answering random letters, but the read is kinda off, don't you think?

i added way more practice exams (and the expected answers to them) to `/home/stijn/Downloads/calc-practice-exams` so you can fine tune those generators so you dont miss anything and i dont miss learning anything.

from now on i also want you to make use of the linter to check for codesmells, refactors, etc. to make the codebase better manageable. i think there's a linter built in to the application no?
- i also want it to check for these big codeblocks that you love to leave behind