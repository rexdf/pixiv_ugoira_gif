// ==UserScript==
// @name        pixiv_ugoira_gif
// @namespace   pixiv_ugoira_gif
// @include     http://www.pixiv.com/*
// @include     http://www.pixiv.net/*
// @description Creates animated GIFs from Ugoira animations hosted on pixiv.
// @version     1
// @grant       none
// @author		ele - ele.ala.ele@gmail.com
// ==/UserScript==
/**
*
*Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
*-The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*-THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*
***/

/**
* This class handles LZW encoding
* Adapted from Jef Poskanzer's Java port by way of J. M. G. Elliott.
* @author Kevin Weiner (original Java version - kweiner@fmsware.com)
* @author Thibault Imbert (AS3 version - bytearray.org)
* @version 0.1 AS3 implementation
*/

//import flash.utils.ByteArray;

LZWEncoder = function()
{
    var exports = {};
	/*private_static*/ var EOF/*int*/ = -1;
	/*private*/ var imgW/*int*/;
	/*private*/ var imgH/*int*/
	/*private*/ var pixAry/*ByteArray*/;
	/*private*/ var initCodeSize/*int*/;
	/*private*/ var remaining/*int*/;
	/*private*/ var curPixel/*int*/;
	
	// GIFCOMPR.C - GIF Image compression routines
	// Lempel-Ziv compression based on 'compress'. GIF modifications by
	// David Rowley (mgardi@watdcsu.waterloo.edu)
	// General DEFINEs
	
	/*private_static*/ var BITS/*int*/ = 12;
	/*private_static*/ var HSIZE/*int*/ = 5003; // 80% occupancy
	
	// GIF Image compression - modified 'compress'
	// Based on: compress.c - File compression ala IEEE Computer, June 1984.
	// By Authors: Spencer W. Thomas (decvax!harpo!utah-cs!utah-gr!thomas)
	// Jim McKie (decvax!mcvax!jim)
	// Steve Davies (decvax!vax135!petsd!peora!srd)
	// Ken Turkowski (decvax!decwrl!turtlevax!ken)
	// James A. Woods (decvax!ihnp4!ames!jaw)
	// Joe Orost (decvax!vax135!petsd!joe)
	
	/*private*/ var n_bits/*int*/ // number of bits/code
	/*private*/ var maxbits/*int*/ = BITS; // user settable max # bits/code
	/*private*/ var maxcode/*int*/ // maximum code, given n_bits
	/*private*/ var maxmaxcode/*int*/ = 1 << BITS; // should NEVER generate this code
	/*private*/ var htab/*Array*/ = new Array;
	/*private*/ var codetab/*Array*/ = new Array;
	/*private*/ var hsize/*int*/ = HSIZE; // for dynamic table sizing
	/*private*/ var free_ent/*int*/ = 0; // first unused entry
	
	// block compression parameters -- after all codes are used up,
	// and compression rate changes, start over.
	
	/*private*/ var clear_flg/*Boolean*/ = false;
	
	// Algorithm: use open addressing double hashing (no chaining) on the
	// prefix code / next character combination. We do a variant of Knuth's
	// algorithm D (vol. 3, sec. 6.4) along with G. Knott's relatively-prime
	// secondary probe. Here, the modular division first probe is gives way
	// to a faster exclusive-or manipulation. Also do block compression with
	// an adaptive reset, whereby the code table is cleared when the compression
	// ratio decreases, but after the table fills. The variable-length output
	// codes are re-sized at this point, and a special CLEAR code is generated
	// for the decompressor. Late addition: construct the table according to
	// file size for noticeable speed improvement on small files. Please direct
	// questions about this implementation to ames!jaw.
	
	/*private*/ var g_init_bits/*int*/;
	/*private*/ var ClearCode/*int*/;
	/*private*/ var EOFCode/*int*/;
	
	// output
	// Output the given code.
	// Inputs:
	// code: A n_bits-bit integer. If == -1, then EOF. This assumes
	// that n_bits =< wordsize - 1.
	// Outputs:
	// Outputs code to the file.
	// Assumptions:
	// Chars are 8 bits long.
	// Algorithm:
	// Maintain a BITS character long buffer (so that 8 codes will
	// fit in it exactly). Use the VAX insv instruction to insert each
	// code in turn. When the buffer fills up empty it and start over.
	
	/*private*/ var cur_accum/*int*/ = 0;
	/*private*/ var cur_bits/*int*/ = 0;
	/*private*/ var masks/*Array*/ = [ 0x0000, 0x0001, 0x0003, 0x0007, 0x000F, 0x001F, 0x003F, 0x007F, 0x00FF, 0x01FF, 0x03FF, 0x07FF, 0x0FFF, 0x1FFF, 0x3FFF, 0x7FFF, 0xFFFF ];
	
	// Number of characters so far in this 'packet'
	/*private*/ var a_count/*int*/;
	
	// Define the storage for the packet accumulator
	/*private*/ var accum/*ByteArray*/ = [];
	
	var LZWEncoder = exports.LZWEncoder = function LZWEncoder (width/*int*/, height/*int*/, pixels/*ByteArray*/, color_depth/*int*/)
	{
		
		imgW = width;
		imgH = height;
		pixAry = pixels;
		initCodeSize = Math.max(2, color_depth);
		
	}
	
	// Add a character to the end of the current packet, and if it is 254
	// characters, flush the packet to disk.
	var char_out = function char_out(c/*Number*/, outs/*ByteArray*/)/*void*/
	{
		accum[a_count++] = c;
		if (a_count >= 254) flush_char(outs);
		
	}
	
	// Clear out the hash table
	// table clear for block compress
	
	var cl_block = function cl_block(outs/*ByteArray*/)/*void*/
	{
		
		cl_hash(hsize);
		free_ent = ClearCode + 2;
		clear_flg = true;
		output(ClearCode, outs);
		
	}
	
	// reset code table
	var cl_hash = function cl_hash(hsize/*int*/)/*void*/
	{
		
		for (var i/*int*/ = 0; i < hsize; ++i) htab[i] = -1;
		
	}
	
	var compress = exports.compress = function compress(init_bits/*int*/, outs/*ByteArray*/)/*void*/
	
	{
		var fcode/*int*/;
		var i/*int*/ /* = 0 */;
		var c/*int*/;
		var ent/*int*/;
		var disp/*int*/;
		var hsize_reg/*int*/;
		var hshift/*int*/;
		
		// Set up the globals: g_init_bits - initial number of bits
		g_init_bits = init_bits;
		
		// Set up the necessary values
		clear_flg = false;
		n_bits = g_init_bits;
		maxcode = MAXCODE(n_bits);

		ClearCode = 1 << (init_bits - 1);
		EOFCode = ClearCode + 1;
		free_ent = ClearCode + 2;

		a_count = 0; // clear packet
	
		ent = nextPixel();

		hshift = 0;
		for (fcode = hsize; fcode < 65536; fcode *= 2)
		  ++hshift;
		hshift = 8 - hshift; // set hash code range bound

		hsize_reg = hsize;
		cl_hash(hsize_reg); // clear hash table
	
		output(ClearCode, outs);
	
		outer_loop: while ((c = nextPixel()) != EOF)
		
		{
			
			fcode = (c << maxbits) + ent;
			i = (c << hshift) ^ ent; // xor hashing

			if (htab[i] == fcode)
			{
			ent = codetab[i];
			continue;
			} else if (htab[i] >= 0) // non-empty slot
			{
				disp = hsize_reg - i; // secondary hash (after G. Knott)
				if (i == 0)
				disp = 1;
				do 
				{
					
					if ((i -= disp) < 0) i += hsize_reg;

					if (htab[i] == fcode)
					{
					ent = codetab[i];
					continue outer_loop;
					}
				} while (htab[i] >= 0);
			}
      
			output(ent, outs);
			ent = c;
			if (free_ent < maxmaxcode)
			{
				codetab[i] = free_ent++; // code -> hashtable
				htab[i] = fcode;
			} else cl_block(outs);
		}
		
		// Put out the final code.
		output(ent, outs);
		output(EOFCode, outs);
		
	}
	
	// ----------------------------------------------------------------------------
	var encode = exports.encode = function encode(os/*ByteArray*/)/*void*/
	{
		os.writeByte(initCodeSize); // write "initial code size" byte
		remaining = imgW * imgH; // reset navigation variables
		curPixel = 0;
		compress(initCodeSize + 1, os); // compress and write the pixel data
		os.writeByte(0); // write block terminator
		
	}
	
	// Flush the packet to disk, and reset the accumulator
	var flush_char = function flush_char(outs/*ByteArray*/)/*void*/
	{
		
		if (a_count > 0)
		{
			outs.writeByte(a_count);
			outs.writeBytes(accum, 0, a_count);
			a_count = 0;
		}
		
	}
	
	var MAXCODE = function MAXCODE(n_bits/*int*/)/*int*/
	{
		
		return (1 << n_bits) - 1;
		
	}
	
	// ----------------------------------------------------------------------------
	// Return the next pixel from the image
	// ----------------------------------------------------------------------------
	
	var nextPixel = function nextPixel()/*int*/
	{
		
		if (remaining == 0) return EOF;
		
		--remaining;
		
		var pix/*Number*/ = pixAry[curPixel++];
		
		return pix & 0xff;
		
	}
	
	var output = function output(code/*int*/, outs/*ByteArray*/)/*void*/
	
	{
		cur_accum &= masks[cur_bits];
		
		if (cur_bits > 0) cur_accum |= (code << cur_bits);
		else cur_accum = code;
		
		cur_bits += n_bits;
		
		while (cur_bits >= 8)
		
		{
			
			char_out((cur_accum & 0xff), outs);
			cur_accum >>= 8;
			cur_bits -= 8;
			
		}
		
		// If the next entry is going to be too big for the code size,
		// then increase it, if possible.
		
		if (free_ent > maxcode || clear_flg)
		{
			
			if (clear_flg)
			{
				
				maxcode = MAXCODE(n_bits = g_init_bits);
				clear_flg = false;
				
			} else
			{
				
				++n_bits;
				
				if (n_bits == maxbits) maxcode = maxmaxcode;
				
				else maxcode = MAXCODE(n_bits);
				
			}
			
		}
		
		if (code == EOFCode) 
		{
			
			// At EOF, write the rest of the buffer.
			while (cur_bits > 0) 
			{
				
				char_out((cur_accum & 0xff), outs);
				cur_accum >>= 8;
				cur_bits -= 8;
			}
			
			
			flush_char(outs);
			
		}
		
	}
	LZWEncoder.apply(this, arguments);
   return exports;
}
	
/*
* NeuQuant Neural-Net Quantization Algorithm
* ------------------------------------------
* 
* Copyright (c) 1994 Anthony Dekker
* 
* NEUQUANT Neural-Net quantization algorithm by Anthony Dekker, 1994. See
* "Kohonen neural networks for optimal colour quantization" in "Network:
* Computation in Neural Systems" Vol. 5 (1994) pp 351-367. for a discussion of
* the algorithm.
* 
* Any party obtaining a copy of these files from the author, directly or
* indirectly, is granted, free of charge, a full and unrestricted irrevocable,
* world-wide, paid up, royalty-free, nonexclusive right and license to deal in
* this software and documentation files (the "Software"), including without
* limitation the rights to use, copy, modify, merge, publish, distribute,
* sublicense, and/or sell copies of the Software, and to permit persons who
* receive copies from any such party to do so, with the only requirement being
* that this copyright notice remain intact.
*/
 
/*
* This class handles Neural-Net quantization algorithm
* @author Kevin Weiner (original Java version - kweiner@fmsware.com)
* @author Thibault Imbert (AS3 version - bytearray.org)
* @version 0.1 AS3 implementation
*/

//import flash.utils.ByteArray;

NeuQuant = function()
{
    var exports = {};
	/*private_static*/ var netsize/*int*/ = 256; /* number of colours used */
	
	/* four primes near 500 - assume no image has a length so large */
	/* that it is divisible by all four primes */
	
	/*private_static*/ var prime1/*int*/ = 499;
	/*private_static*/ var prime2/*int*/ = 491;
	/*private_static*/ var prime3/*int*/ = 487;
	/*private_static*/ var prime4/*int*/ = 503;
	/*private_static*/ var minpicturebytes/*int*/ = (3 * prime4);
	
	/* minimum size for input image */
	/*
	* Program Skeleton ---------------- [select samplefac in range 1..30] [read
	* image from input file] pic = (unsigned char*) malloc(3*width*height);
	* initnet(pic,3*width*height,samplefac); learn(); unbiasnet(); [write output
	* image header, using writecolourmap(f)] inxbuild(); write output image using
	* inxsearch(b,g,r)
	*/

	/*
	* Network Definitions -------------------
	*/
	
	/*private_static*/ var maxnetpos/*int*/ = (netsize - 1);
	/*private_static*/ var netbiasshift/*int*/ = 4; /* bias for colour values */
	/*private_static*/ var ncycles/*int*/ = 100; /* no. of learning cycles */
	
	/* defs for freq and bias */
	/*private_static*/ var intbiasshift/*int*/ = 16; /* bias for fractions */
	/*private_static*/ var intbias/*int*/ = (1 << intbiasshift);
	/*private_static*/ var gammashift/*int*/ = 10; /* gamma = 1024 */
	/*private_static*/ var gamma/*int*/ = (1 << gammashift);
	/*private_static*/ var betashift/*int*/ = 10;
	/*private_static*/ var beta/*int*/ = (intbias >> betashift); /* beta = 1/1024 */
	/*private_static*/ var betagamma/*int*/ = (intbias << (gammashift - betashift));
	
	/* defs for decreasing radius factor */
	/*private_static*/ var initrad/*int*/ = (netsize >> 3); /*
                                                         * for 256 cols, radius
                                                         * starts
                                                         */
														 
	/*private_static*/ var radiusbiasshift/*int*/ = 6; /* at 32.0 biased by 6 bits */
	/*private_static*/ var radiusbias/*int*/ = (1 << radiusbiasshift);
	/*private_static*/ var initradius/*int*/ = (initrad * radiusbias); /*
                                                                   * and
                                                                   * decreases
                                                                   * by a
                                                                   */
																   
	/*private_static*/ var radiusdec/*int*/ = 30; /* factor of 1/30 each cycle */
	
	/* defs for decreasing alpha factor */
	/*private_static*/ var alphabiasshift/*int*/ = 10; /* alpha starts at 1.0 */
	/*private_static*/ var initalpha/*int*/ = (1 << alphabiasshift);
	/*private*/ var alphadec/*int*/ /* biased by 10 bits */
	
	/* radbias and alpharadbias used for radpower calculation */
	/*private_static*/ var radbiasshift/*int*/ = 8;
	/*private_static*/ var radbias/*int*/ = (1 << radbiasshift);
	/*private_static*/ var alpharadbshift/*int*/ = (alphabiasshift + radbiasshift);
	
	/*private_static*/ var alpharadbias/*int*/ = (1 << alpharadbshift);
	
	/*
	* Types and Global Variables --------------------------
	*/
	
	/*private*/ var thepicture/*ByteArray*//* the input image itself */
	/*private*/ var lengthcount/*int*/; /* lengthcount = H*W*3 */
	/*private*/ var samplefac/*int*/; /* sampling factor 1..30 */
	
	// typedef int pixel[4]; /* BGRc */
	/*private*/ var network/*Array*/; /* the network itself - [netsize][4] */
	/*protected*/ var netindex/*Array*/ = new Array();
	
	/* for network lookup - really 256 */
	/*private*/ var bias/*Array*/ = new Array();
	
	/* bias and freq arrays for learning */
	/*private*/ var freq/*Array*/ = new Array();
	/*private*/ var radpower/*Array*/ = new Array();
	
	var NeuQuant = exports.NeuQuant = function NeuQuant(thepic/*ByteArray*/, len/*int*/, sample/*int*/)
	{
		
		var i/*int*/;
		var p/*Array*/;
		
		thepicture = thepic;
		lengthcount = len;
		samplefac = sample;
		
		network = new Array(netsize);
		
		for (i = 0; i < netsize; i++)
		{
			
			network[i] = new Array(4);
			p = network[i];
			p[0] = p[1] = p[2] = (i << (netbiasshift + 8)) / netsize;
			freq[i] = intbias / netsize; /* 1/netsize */
			bias[i] = 0;
		}
		
	}
	
	var colorMap = function colorMap()/*ByteArray*/
	{
		
		var map/*ByteArray*/ = [];
	    var index/*Array*/ = new Array(netsize);
	    for (var i/*int*/ = 0; i < netsize; i++)
	      index[network[i][3]] = i;
	    var k/*int*/ = 0;
	    for (var l/*int*/ = 0; l < netsize; l++) {
	      var j/*int*/ = index[l];
	      map[k++] = (network[j][0]);
	      map[k++] = (network[j][1]);
	      map[k++] = (network[j][2]);
	    }
	    return map;
		
	}
	
	/*
   * Insertion sort of network and building of netindex[0..255] (to do after
   * unbias)
   * -------------------------------------------------------------------------------
   */
   
   var inxbuild = function inxbuild()/*void*/
   {
	   
	  var i/*int*/;
	  var j/*int*/;
	  var smallpos/*int*/;
	  var smallval/*int*/;
	  var p/*Array*/;
	  var q/*Array*/;
	  var previouscol/*int*/
	  var startpos/*int*/
	  
	  previouscol = 0;
	  startpos = 0;
	  for (i = 0; i < netsize; i++)
	  {
		  
		  p = network[i];
		  smallpos = i;
		  smallval = p[1]; /* index on g */
		  /* find smallest in i..netsize-1 */
		  for (j = i + 1; j < netsize; j++)
		  {
			  q = network[j];
			  if (q[1] < smallval)
			  { /* index on g */
			  
				smallpos = j;
				smallval = q[1]; /* index on g */
			}
		  }
		  
		  q = network[smallpos];
		  /* swap p (i) and q (smallpos) entries */
		  
		  if (i != smallpos)
		  {
			  
			  j = q[0];
			  q[0] = p[0];
			  p[0] = j;
			  j = q[1];
			  q[1] = p[1];
			  p[1] = j;
			  j = q[2];
			  q[2] = p[2];
			  p[2] = j;
			  j = q[3];
			  q[3] = p[3];
			  p[3] = j;
			  
		  }
		  
		  /* smallval entry is now in position i */
		  
		  if (smallval != previouscol)
		  
		  {
			  
			netindex[previouscol] = (startpos + i) >> 1;
			  
			for (j = previouscol + 1; j < smallval; j++) netindex[j] = i;
			  
			previouscol = smallval;
			startpos = i;
			
		  }
		  
		}
		
		netindex[previouscol] = (startpos + maxnetpos) >> 1;
		for (j = previouscol + 1; j < 256; j++) netindex[j] = maxnetpos; /* really 256 */
		
   }
   
   /*
   * Main Learning Loop ------------------
   */
   
   var learn = function learn()/*void*/ 
   
   {
	   
	   var i/*int*/;
	   var j/*int*/;
	   var b/*int*/;
	   var g/*int*/
	   var r/*int*/;
	   var radius/*int*/;
	   var rad/*int*/;
	   var alpha/*int*/;
	   var step/*int*/;
	   var delta/*int*/;
	   var samplepixels/*int*/;
	   var p/*ByteArray*/;
	   var pix/*int*/;
	   var lim/*int*/;
	   
	   if (lengthcount < minpicturebytes) samplefac = 1;
	   
	   alphadec = 30 + ((samplefac - 1) / 3);
	   p = thepicture;
	   pix = 0;
	   lim = lengthcount;
	   samplepixels = lengthcount / (3 * samplefac);
	   delta = (samplepixels / ncycles) | 0;
	   alpha = initalpha;
	   radius = initradius;
	   
	   rad = radius >> radiusbiasshift;
	   if (rad <= 1) rad = 0;
	   
	   for (i = 0; i < rad; i++) radpower[i] = alpha * (((rad * rad - i * i) * radbias) / (rad * rad));
	   
	   
	   if (lengthcount < minpicturebytes) step = 3;
	   
	   else if ((lengthcount % prime1) != 0) step = 3 * prime1;
	   
	   else
	   
	   {
		   
		   if ((lengthcount % prime2) != 0) step = 3 * prime2;
		   
		   else
		   
		   {
			   
			   if ((lengthcount % prime3) != 0) step = 3 * prime3;
			   
			   else step = 3 * prime4;
			   
		   }
		   
	   }
	   
	   i = 0;
	   
	   while (i < samplepixels)
	   
	   {
		   
		   b = (p[pix + 0] & 0xff) << netbiasshift;
		   g = (p[pix + 1] & 0xff) << netbiasshift;
		   r = (p[pix + 2] & 0xff) << netbiasshift;
		   j = contest(b, g, r);
		   
		   altersingle(alpha, j, b, g, r);
		   
		   if (rad != 0) alterneigh(rad, j, b, g, r); /* alter neighbours */
		   
		   pix += step;
		   
		   if (pix >= lim) pix -= lengthcount;
		   
		   i++;
		   
		   if (delta == 0) delta = 1;
		   
		   if (i % delta == 0)
		   
		   {
			   
			   alpha -= alpha / alphadec;
			   radius -= radius / radiusdec;
			   rad = radius >> radiusbiasshift;
			   
			   if (rad <= 1) rad = 0;
			   
			   for (j = 0; j < rad; j++) radpower[j] = alpha * (((rad * rad - j * j) * radbias) / (rad * rad));
			   
		   }
		   
	   }
	   
   }
   
   /*
   ** Search for BGR values 0..255 (after net is unbiased) and return colour
   * index
   * ----------------------------------------------------------------------------
   */
   
   var map = exports.map = function map(b/*int*/, g/*int*/, r/*int*/)/*int*/
  
   {
	   
	   var i/*int*/;
	   var j/*int*/;
	   var dist/*int*/
	   var a/*int*/;
	   var bestd/*int*/;
	   var p/*Array*/;
	   var best/*int*/;
	   
	   bestd = 1000; /* biggest possible dist is 256*3 */
	   best = -1;
	   i = netindex[g]; /* index on g */
	   j = i - 1; /* start at netindex[g] and work outwards */

    while ((i < netsize) || (j >= 0))
	
	{
		
		if (i < netsize)
		
		{
			
			p = network[i];
			
			dist = p[1] - g; /* inx key */
			
			if (dist >= bestd) i = netsize; /* stop iter */
			
			else
			
			{
				
				i++;
				
				if (dist < 0) dist = -dist;
				
				a = p[0] - b;
				
				if (a < 0) a = -a;
				
				dist += a;
				
				if (dist < bestd)
				
				{
					
					a = p[2] - r;
					
					if (a < 0) a = -a;
					
					dist += a;
					
					if (dist < bestd)
					
					{
						
						bestd = dist;
						best = p[3];
						
					}
					
				}
				
			}
			
		}
	  
      if (j >= 0)
	  {
		  
		  p = network[j];
		  
		  dist = g - p[1]; /* inx key - reverse dif */
		  
		  if (dist >= bestd) j = -1; /* stop iter */
		  
		  else 
		  {
			  
			  j--;
			  if (dist < 0) dist = -dist;
			  a = p[0] - b;
			  if (a < 0) a = -a;
			  dist += a;
			  
			  if (dist < bestd)
			  
			  {
				  
				  a = p[2] - r;
				  if (a < 0)a = -a;
				  dist += a;
				  if (dist < bestd)
				  {
					  bestd = dist;
					  best = p[3];
				  }
				  
			  }
			  
		  }
		  
	  }
	  
	}
	
    return (best);
	
  }
  
  var process = exports.process = function process()/*ByteArray*/
  {
   
    learn();
    unbiasnet();
    inxbuild();
    return colorMap();
	
  }
  
  /*
  * Unbias network to give byte values 0..255 and record position i to prepare
  * for sort
  * -----------------------------------------------------------------------------------
  */
  
  var unbiasnet = function unbiasnet()/*void*/
  
  {

    var i/*int*/;
    var j/*int*/;

    for (i = 0; i < netsize; i++)
	{
      network[i][0] >>= netbiasshift;
      network[i][1] >>= netbiasshift;
      network[i][2] >>= netbiasshift;
      network[i][3] = i; /* record colour no */
    }
	
  }
  
  /*
  * Move adjacent neurons by precomputed alpha*(1-((i-j)^2/[r]^2)) in
  * radpower[|i-j|]
  * ---------------------------------------------------------------------------------
  */
  
  var alterneigh = function alterneigh(rad/*int*/, i/*int*/, b/*int*/, g/*int*/, r/*int*/)/*void*/
  
  {
	  
	  var j/*int*/;
	  var k/*int*/;
	  var lo/*int*/;
	  var hi/*int*/;
	  var a/*int*/;
	  var m/*int*/;
	  
	  var p/*Array*/;
	  
	  lo = i - rad;
	  if (lo < -1) lo = -1;
	  
	  hi = i + rad;
	  
	  if (hi > netsize) hi = netsize;
	  
	  j = i + 1;
	  k = i - 1;
	  m = 1;
	  
	  while ((j < hi) || (k > lo))
	  
	  {
		  
		  a = radpower[m++];
		  
		  if (j < hi)
		  
		  {
			  
			  p = network[j++];
			  
			  try {
				  
				  p[0] -= (a * (p[0] - b)) / alpharadbias;
				  p[1] -= (a * (p[1] - g)) / alpharadbias;
				  p[2] -= (a * (p[2] - r)) / alpharadbias;
				  
				  } catch (e/*Error*/) {} // prevents 1.3 miscompilation
				  
			}
			
			if (k > lo)
			
			{
				
				p = network[k--];
				
				try
				{
					
					p[0] -= (a * (p[0] - b)) / alpharadbias;
					p[1] -= (a * (p[1] - g)) / alpharadbias;
					p[2] -= (a * (p[2] - r)) / alpharadbias;
					
				} catch (e/*Error*/) {}
				
			}
			
	  }
	  
  }
  
  /*
  * Move neuron i towards biased (b,g,r) by factor alpha
  * ----------------------------------------------------
  */
  
  var altersingle = function altersingle(alpha/*int*/, i/*int*/, b/*int*/, g/*int*/, r/*int*/)/*void*/ 
  {
	  
	  /* alter hit neuron */
	  var n/*Array*/ = network[i];
	  n[0] -= (alpha * (n[0] - b)) / initalpha;
	  n[1] -= (alpha * (n[1] - g)) / initalpha;
	  n[2] -= (alpha * (n[2] - r)) / initalpha;
	
  }
  
  /*
  * Search for biased BGR values ----------------------------
  */
  
  var contest = function contest(b/*int*/, g/*int*/, r/*int*/)/*int*/
  {
	  
	  /* finds closest neuron (min dist) and updates freq */
	  /* finds best neuron (min dist-bias) and returns position */
	  /* for frequently chosen neurons, freq[i] is high and bias[i] is negative */
	  /* bias[i] = gamma*((1/netsize)-freq[i]) */
	  
	  var i/*int*/;
	  var dist/*int*/;
	  var a/*int*/;
	  var biasdist/*int*/;
	  var betafreq/*int*/;
	  var bestpos/*int*/;
	  var bestbiaspos/*int*/;
	  var bestd/*int*/;
	  var bestbiasd/*int*/;
	  var n/*Array*/;
	  
	  bestd = ~(1 << 31);
	  bestbiasd = bestd;
	  bestpos = -1;
	  bestbiaspos = bestpos;
	  
	  for (i = 0; i < netsize; i++)
	  
	  {
		  
		  n = network[i];
		  dist = n[0] - b;
		  
		  if (dist < 0) dist = -dist;
		  
		  a = n[1] - g;
		  
		  if (a < 0) a = -a;
		  
		  dist += a;
		  
		  a = n[2] - r;
		  
		  if (a < 0) a = -a;
		  
		  dist += a;
		  
		  if (dist < bestd)
		  
		  {
			  
			  bestd = dist;
			  bestpos = i;
			  
		  }
		  
		  biasdist = dist - ((bias[i]) >> (intbiasshift - netbiasshift));
		  
		  if (biasdist < bestbiasd)
		  
		  {
			  
			  bestbiasd = biasdist;
			  bestbiaspos = i;
			  
		  }
		  
		  betafreq = (freq[i] >> betashift);
		  freq[i] -= betafreq;
		  bias[i] += (betafreq << gammashift);
		  
	  }
	  
	  freq[bestpos] += beta;
	  bias[bestpos] -= betagamma;
	  return (bestbiaspos);
	  
  }
  
  NeuQuant.apply(this, arguments);
  return exports;
}

/**
 * This class lets you encode animated GIF files
 * Base class :  http://www.java2s.com/Code/Java/2D-Graphics-GUI/AnimatedGifEncoder.htm
 * @author Kevin Weiner (original Java version - kweiner@fmsware.com)
 * @author Thibault Imbert (AS3 version - bytearray.org)
 * @author Kevin Kwok (JavaScript version - https://github.com/antimatter15/jsgif)
 * @version 0.1 AS3 implementation
 */

GIFEncoder = function() {

	for (var i = 0, chr = {}; i < 256; i++)
		chr[i] = String.fromCharCode(i);

	function ByteArray() {
		this.bin = [];
	}

	ByteArray.prototype.getData = function() {
		for (var v = '', l = this.bin.length, i = 0; i < l; i++)
			v += chr[this.bin[i]];
		return v;
	};

	ByteArray.prototype.writeByte = function(val) {
		this.bin.push(val);
	};

	ByteArray.prototype.writeUTFBytes = function(string) {
		for (var l = string.length, i = 0; i < l; i++)
			this.writeByte(string.charCodeAt(i));
	};

	ByteArray.prototype.writeBytes = function(array, offset, length) {
		for (var l = length || array.length, i = offset || 0; i < l; i++)
			this.writeByte(array[i]);
	};

	var exports = {};
	var width; // image size
	var height;
	var transparent = null; // transparent color if given
	var transIndex; // transparent index in color table
	var repeat = -1; // no repeat
	var delay = 0; // frame delay (hundredths)
	var started = false; // ready to output frames
	var out;
	var image; // current frame
	var pixels; // BGR byte array from frame
	var indexedPixels; // converted frame indexed to palette
	var colorDepth; // number of bit planes
	var colorTab; // RGB palette
	var usedEntry = []; // active palette entries
	var palSize = 7; // color table size (bits-1)
	var dispose = -1; // disposal code (-1 = use default)
	var closeStream = false; // close stream when finished
	var firstFrame = true;
	var sizeSet = false; // if false, get size from first frame
	var sample = 10; // default sample interval for quantizer
	var comment = "Generated by jsgif (https://github.com/antimatter15/jsgif/)"; // default comment for generated gif

	/**
	 * Sets the delay time between each frame, or changes it for subsequent frames
	 * (applies to last frame added)
	 * int delay time in milliseconds
	 * @param ms
	 */

	var setDelay = exports.setDelay = function setDelay(ms) {
		delay = Math.round(ms / 10);
	};

	/**
	 * Sets the GIF frame disposal code for the last added frame and any
	 *
	 * subsequent frames. Default is 0 if no transparent color has been set,
	 * otherwise 2.
	 * @param code
	 * int disposal code.
	 */

	var setDispose = exports.setDispose = function setDispose(code) {
		if (code >= 0) dispose = code;
	};

	/**
	 * Sets the number of times the set of GIF frames should be played. Default is
	 * 1; 0 means play indefinitely. Must be invoked before the first image is
	 * added.
	 *
	 * @param iter
	 * int number of iterations.
	 * @return
	 */

	var setRepeat = exports.setRepeat = function setRepeat(iter) {
		if (iter >= 0) repeat = iter;
	};

	/**
	 * Sets the transparent color for the last added frame and any subsequent
	 * frames. Since all colors are subject to modification in the quantization
	 * process, the color in the final palette for each frame closest to the given
	 * color becomes the transparent color for that frame. May be set to null to
	 * indicate no transparent color.
	 * @param
	 * Color to be treated as transparent on display.
	 */

	var setTransparent = exports.setTransparent = function setTransparent(c) {
		transparent = c;
	};


	/**
	 * Sets the comment for the block comment
	 * @param
	 * string to be insterted as comment
	 */

	var setComment = exports.setComment = function setComment(c) {
		comment = c;
	};



	/**
	 * The addFrame method takes an incoming BitmapData object to create each frames
	 * @param
	 * BitmapData object to be treated as a GIF's frame
	 */

	var addFrame = exports.addFrame = function addFrame(im, is_imageData) {

		if ((im === null) || !started || out === null) {
			throw new Error("Please call start method before calling addFrame");
		}

		var ok = true;

		try {
			if (!is_imageData) {
				image = im.getImageData(0, 0, im.canvas.width, im.canvas.height).data;
				if (!sizeSet) setSize(im.canvas.width, im.canvas.height);
			} else {
				image = im;
			}
			getImagePixels(); // convert to correct format if necessary
			analyzePixels(); // build color table & map pixels

			if (firstFrame) {
				writeLSD(); // logical screen descriptior
				writePalette(); // global color table
				if (repeat >= 0) {
					// use NS app extension to indicate reps
					writeNetscapeExt();
				}
			}

			writeGraphicCtrlExt(); // write graphic control extension
			if (comment !== '') {
				writeCommentExt(); // write comment extension
			}
			writeImageDesc(); // image descriptor
			if (!firstFrame) writePalette(); // local color table
			writePixels(); // encode and write pixel data
			firstFrame = false;
		} catch (e) {
			ok = false;
		}

		return ok;
	};

	/**
	 * Adds final trailer to the GIF stream, if you don't call the finish method
	 * the GIF stream will not be valid.
	 */

	var finish = exports.finish = function finish() {

		if (!started) return false;

		var ok = true;
		started = false;

		try {
			out.writeByte(0x3b); // gif trailer
		} catch (e) {
			ok = false;
		}

		return ok;
	};

	/**
	 * Resets some members so that a new stream can be started.
	 * This method is actually called by the start method
	 */

	var reset = function reset() {

		// reset for subsequent use
		transIndex = 0;
		image = null;
		pixels = null;
		indexedPixels = null;
		colorTab = null;
		closeStream = false;
		firstFrame = true;
	};

	/**
	 * * Sets frame rate in frames per second. Equivalent to
	 * <code>setDelay(1000/fps)</code>.
	 * @param fps
	 * float frame rate (frames per second)
	 */

	var setFrameRate = exports.setFrameRate = function setFrameRate(fps) {
		if (fps != 0xf) delay = Math.round(100 / fps);
	};

	/**
	 * Sets quality of color quantization (conversion of images to the maximum 256
	 * colors allowed by the GIF specification). Lower values (minimum = 1)
	 * produce better colors, but slow processing significantly. 10 is the
	 * default, and produces good color mapping at reasonable speeds. Values
	 * greater than 20 do not yield significant improvements in speed.
	 * @param quality
	 * int greater than 0.
	 * @return
	 */

	var setQuality = exports.setQuality = function setQuality(quality) {
		if (quality < 1) quality = 1;
		sample = quality;
	};

	/**
	 * Sets the GIF frame size. The default size is the size of the first frame
	 * added if this method is not invoked.
	 * @param w
	 * int frame width.
	 * @param h
	 * int frame width.
	 */

	var setSize = exports.setSize = function setSize(w, h) {

		if (started && !firstFrame) return;
		width = w;
		height = h;
		if (width < 1) width = 320;
		if (height < 1) height = 240;
		sizeSet = true;
	};

	/**
	 * Initiates GIF file creation on the given stream.
	 * @param os
	 * OutputStream on which GIF images are written.
	 * @return false if initial write failed.
	 */

	var start = exports.start = function start() {

		reset();
		var ok = true;
		closeStream = false;
		out = new ByteArray();
		try {
			out.writeUTFBytes("GIF89a"); // header
		} catch (e) {
			ok = false;
		}

		return started = ok;
	};

	var cont = exports.cont = function cont() {

		reset();
		var ok = true;
		closeStream = false;
		out = new ByteArray();

		return started = ok;
	};

	/**
	 * Analyzes image colors and creates color map.
	 */

	var analyzePixels = function analyzePixels() {

		var len = pixels.length;
		var nPix = len / 3;
		indexedPixels = [];
		var nq = new NeuQuant(pixels, len, sample);

		// initialize quantizer
		colorTab = nq.process(); // create reduced palette

		// map image pixels to new palette
		var k = 0;
		for (var j = 0; j < nPix; j++) {
			var index = nq.map(pixels[k++] & 0xff, pixels[k++] & 0xff, pixels[k++] & 0xff);
			usedEntry[index] = true;
			indexedPixels[j] = index;
		}

		pixels = null;
		colorDepth = 8;
		palSize = 7;

		// get closest match to transparent color if specified
		if (transparent !== null) {
			transIndex = findClosest(transparent);
		}
	};

	/**
	 * Returns index of palette color closest to c
	 */

	var findClosest = function findClosest(c) {

		if (colorTab === null) return -1;
		var r = (c & 0xFF0000) >> 16;
		var g = (c & 0x00FF00) >> 8;
		var b = (c & 0x0000FF);
		var minpos = 0;
		var dmin = 256 * 256 * 256;
		var len = colorTab.length;

		for (var i = 0; i < len;) {
			var dr = r - (colorTab[i++] & 0xff);
			var dg = g - (colorTab[i++] & 0xff);
			var db = b - (colorTab[i] & 0xff);
			var d = dr * dr + dg * dg + db * db;
			var index = i / 3;
			if (usedEntry[index] && (d < dmin)) {
				dmin = d;
				minpos = index;
			}
			i++;
		}
		return minpos;
	};

	/**
	 * Extracts image pixels into byte array "pixels
	 */

	var getImagePixels = function getImagePixels() {
		var w = width;
		var h = height;
		pixels = [];
		var data = image;
		var count = 0;

		for (var i = 0; i < h; i++) {

			for (var j = 0; j < w; j++) {

				var b = (i * w * 4) + j * 4;
				pixels[count++] = data[b];
				pixels[count++] = data[b + 1];
				pixels[count++] = data[b + 2];

			}

		}
	};

	/**
	 * Writes Graphic Control Extension
	 */

	var writeGraphicCtrlExt = function writeGraphicCtrlExt() {
		out.writeByte(0x21); // extension introducer
		out.writeByte(0xf9); // GCE label
		out.writeByte(4); // data block size
		var transp;
		var disp;
		if (transparent === null) {
			transp = 0;
			disp = 0; // dispose = no action
		} else {
			transp = 1;
			disp = 2; // force clear if using transparent color
		}
		if (dispose >= 0) {
			disp = dispose & 7; // user override
		}
		disp <<= 2;
		// packed fields
		out.writeByte(0 | // 1:3 reserved
			disp | // 4:6 disposal
			0 | // 7 user input - 0 = none
			transp); // 8 transparency flag

		WriteShort(delay); // delay x 1/100 sec
		out.writeByte(transIndex); // transparent color index
		out.writeByte(0); // block terminator
	};

	/**
	 * Writes Comment Extention
	 */

	var writeCommentExt = function writeCommentExt() {
		out.writeByte(0x21); // extension introducer
		out.writeByte(0xfe); // comment label
		out.writeByte(comment.length); // Block Size (s)
		out.writeUTFBytes(comment);
		out.writeByte(0); // block terminator
	};


	/**
	 * Writes Image Descriptor
	 */

	var writeImageDesc = function writeImageDesc() {

		out.writeByte(0x2c); // image separator
		WriteShort(0); // image position x,y = 0,0
		WriteShort(0);
		WriteShort(width); // image size
		WriteShort(height);

		// packed fields
		if (firstFrame) {
			// no LCT - GCT is used for first (or only) frame
			out.writeByte(0);
		} else {
			// specify normal LCT
			out.writeByte(0x80 | // 1 local color table 1=yes
				0 | // 2 interlace - 0=no
				0 | // 3 sorted - 0=no
				0 | // 4-5 reserved
				palSize); // 6-8 size of color table
		}
	};

	/**
	 * Writes Logical Screen Descriptor
	 */

	var writeLSD = function writeLSD() {

		// logical screen size
		WriteShort(width);
		WriteShort(height);
		// packed fields
		out.writeByte((0x80 | // 1 : global color table flag = 1 (gct used)
			0x70 | // 2-4 : color resolution = 7
			0x00 | // 5 : gct sort flag = 0
			palSize)); // 6-8 : gct size

		out.writeByte(0); // background color index
		out.writeByte(0); // pixel aspect ratio - assume 1:1
	};

	/**
	 * Writes Netscape application extension to define repeat count.
	 */

	var writeNetscapeExt = function writeNetscapeExt() {
		out.writeByte(0x21); // extension introducer
		out.writeByte(0xff); // app extension label
		out.writeByte(11); // block size
		out.writeUTFBytes("NETSCAPE" + "2.0"); // app id + auth code
		out.writeByte(3); // sub-block size
		out.writeByte(1); // loop sub-block id
		WriteShort(repeat); // loop count (extra iterations, 0=repeat forever)
		out.writeByte(0); // block terminator
	};

	/**
	 * Writes color table
	 */

	var writePalette = function writePalette() {
		out.writeBytes(colorTab);
		var n = (3 * 256) - colorTab.length;
		for (var i = 0; i < n; i++) out.writeByte(0);
	};

	var WriteShort = function WriteShort(pValue) {
		out.writeByte(pValue & 0xFF);
		out.writeByte((pValue >> 8) & 0xFF);
	};

	/**
	 * Encodes and writes pixel data
	 */

	var writePixels = function writePixels() {
		var myencoder = new LZWEncoder(width, height, indexedPixels, colorDepth);
		myencoder.encode(out);
	};

	/**
	 * Retrieves the GIF stream
	 */

	var stream = exports.stream = function stream() {
		return out;
	};

	var setProperties = exports.setProperties = function setProperties(has_start, is_first) {
		started = has_start;
		firstFrame = is_first;
	};

	return exports;

};

function encode64(input) {
	var output = "", i = 0, l = input.length,
	key = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", 
	chr1, chr2, chr3, enc1, enc2, enc3, enc4;
	while (i < l) {
		chr1 = input.charCodeAt(i++);
		chr2 = input.charCodeAt(i++);
		chr3 = input.charCodeAt(i++);
		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
		enc4 = chr3 & 63;
		if (isNaN(chr2)) enc3 = enc4 = 64;
		else if (isNaN(chr3)) enc4 = 64;
		output = output + key.charAt(enc1) + key.charAt(enc2) + key.charAt(enc3) + key.charAt(enc4);
	}
	return output;
}

/*
var vid = new Whammy.Video();
vid.add(canvas or data url)
vid.compile()
*/

//window.Whammy = (function(){
// in this case, frames has a very specific meaning, which will be
// detailed once i finish writing the code
function w(){
function toWebM(frames, outputAsArray){
	var info = checkFrames(frames);

	//max duration by cluster in milliseconds
	var CLUSTER_MAX_DURATION = 30000;

	var EBML = [
		{
			"id": 0x1a45dfa3, // EBML
			"data": [
				{
					"data": 1,
					"id": 0x4286 // EBMLVersion
				},
				{
					"data": 1,
					"id": 0x42f7 // EBMLReadVersion
				},
				{
					"data": 4,
					"id": 0x42f2 // EBMLMaxIDLength
				},
				{
					"data": 8,
					"id": 0x42f3 // EBMLMaxSizeLength
				},
				{
					"data": "webm",
					"id": 0x4282 // DocType
				},
				{
					"data": 2,
					"id": 0x4287 // DocTypeVersion
				},
				{
					"data": 2,
					"id": 0x4285 // DocTypeReadVersion
				}
			]
		},
		{
			"id": 0x18538067, // Segment
			"data": [
				{
					"id": 0x1549a966, // Info
					"data": [
						{
							"data": 1e6, //do things in millisecs (num of nanosecs for duration scale)
							"id": 0x2ad7b1 // TimecodeScale
						},
						{
							"data": "whammy",
							"id": 0x4d80 // MuxingApp
						},
						{
							"data": "whammy",
							"id": 0x5741 // WritingApp
						},
						{
							"data": doubleToString(info.duration),
							"id": 0x4489 // Duration
						}
					]
				},
				{
					"id": 0x1654ae6b, // Tracks
					"data": [
						{
							"id": 0xae, // TrackEntry
							"data": [
								{
									"data": 1,
									"id": 0xd7 // TrackNumber
								},
								{
									"data": 1,
									"id": 0x63c5 // TrackUID
								},
								{
									"data": 0,
									"id": 0x9c // FlagLacing
								},
								{
									"data": "und",
									"id": 0x22b59c // Language
								},
								{
									"data": "V_VP8",
									"id": 0x86 // CodecID
								},
								{
									"data": "VP8",
									"id": 0x258688 // CodecName
								},
								{
									"data": 1,
									"id": 0x83 // TrackType
								},
								{
									"id": 0xe0,  // Video
									"data": [
										{
											"data": info.width,
											"id": 0xb0 // PixelWidth
										},
										{
											"data": info.height,
											"id": 0xba // PixelHeight
										}
									]
								}
							]
						}
					]
				},

				//cluster insertion point
			]
		}
	 ];


	//Generate clusters (max duration)
	var frameNumber = 0;
	var clusterTimecode = 0;
	while(frameNumber < frames.length){

		var clusterFrames = [];
		var clusterDuration = 0;
		do {
			clusterFrames.push(frames[frameNumber]);
			clusterDuration += frames[frameNumber].duration;
			frameNumber++;
		}while(frameNumber < frames.length && clusterDuration < CLUSTER_MAX_DURATION);

		var clusterCounter = 0;
		var cluster = {
				"id": 0x1f43b675, // Cluster
				"data": [
					{
						"data": Math.round(clusterTimecode),
						"id": 0xe7 // Timecode
					}
				].concat(clusterFrames.map(function(webp){
					var block = makeSimpleBlock({
						discardable: 0,
						frame: webp.data.slice(4),
						invisible: 0,
						keyframe: 1,
						lacing: 0,
						trackNum: 1,
						timecode: Math.round(clusterCounter)
					});
					clusterCounter += webp.duration;
					return {
						data: block,
						id: 0xa3
					};
				}))
			}

		//Add cluster to segment
		EBML[1].data.push(cluster);
		clusterTimecode += clusterDuration;
	}

	return generateEBML(EBML, outputAsArray)
}

// sums the lengths of all the frames and gets the duration, woo

function checkFrames(frames){
	var width = frames[0].width,
		height = frames[0].height,
		duration = frames[0].duration;
	for(var i = 1; i < frames.length; i++){
		if(frames[i].width != width) throw "Frame " + (i + 1) + " has a different width";
		if(frames[i].height != height) throw "Frame " + (i + 1) + " has a different height";
		if(frames[i].duration < 0 || frames[i].duration > 0x7fff) throw "Frame " + (i + 1) + " has a weird duration (must be between 0 and 32767)";
		duration += frames[i].duration;
	}
	return {
		duration: duration,
		width: width,
		height: height
	};
}


function numToBuffer(num){
	var parts = [];
	while(num > 0){
		parts.push(num & 0xff)
		num = num >> 8
	}
	return new Uint8Array(parts.reverse());
}

function strToBuffer(str){
	// return new Blob([str]);

	var arr = new Uint8Array(str.length);
	for(var i = 0; i < str.length; i++){
		arr[i] = str.charCodeAt(i)
	}
	return arr;
	// this is slower
	// return new Uint8Array(str.split('').map(function(e){
	// 	return e.charCodeAt(0)
	// }))
}


//sorry this is ugly, and sort of hard to understand exactly why this was done
// at all really, but the reason is that there's some code below that i dont really
// feel like understanding, and this is easier than using my brain.

function bitsToBuffer(bits){
	var data = [];
	var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : '';
	bits = pad + bits;
	for(var i = 0; i < bits.length; i+= 8){
		data.push(parseInt(bits.substr(i,8),2))
	}
	return new Uint8Array(data);
}

function generateEBML(json, outputAsArray){
	var ebml = [];
	for(var i = 0; i < json.length; i++){
		var data = json[i].data;
		if(typeof data == 'object') data = generateEBML(data, outputAsArray);
		if(typeof data == 'number') data = bitsToBuffer(data.toString(2));
		if(typeof data == 'string') data = strToBuffer(data);

		if(data.length){
			var z = z;
		}

		var len = data.size || data.byteLength || data.length;
		var zeroes = Math.ceil(Math.ceil(Math.log(len)/Math.log(2))/8);
		var size_str = len.toString(2);
		var padded = (new Array((zeroes * 7 + 7 + 1) - size_str.length)).join('0') + size_str;
		var size = (new Array(zeroes)).join('0') + '1' + padded;

		//i actually dont quite understand what went on up there, so I'm not really
		//going to fix this, i'm probably just going to write some hacky thing which
		//converts that string into a buffer-esque thing

		ebml.push(numToBuffer(json[i].id));
		ebml.push(bitsToBuffer(size));
		ebml.push(data)


	}

	//output as blob or byteArray
	if(outputAsArray){
		//convert ebml to an array
		var buffer = toFlatArray(ebml)
		return new Uint8Array(buffer);
	}else{
		return new Blob(ebml, {type: "video/webm"});
	}
}

function toFlatArray(arr, outBuffer){
	if(outBuffer == null){
		outBuffer = [];
	}
	for(var i = 0; i < arr.length; i++){
		if(typeof arr[i] == 'object'){
			//an array
			toFlatArray(arr[i], outBuffer)
		}else{
			//a simple element
			outBuffer.push(arr[i]);
		}
	}
	return outBuffer;
}

//OKAY, so the following two functions are the string-based old stuff, the reason they're
//still sort of in here, is that they're actually faster than the new blob stuff because
//getAsFile isn't widely implemented, or at least, it doesn't work in chrome, which is the
// only browser which supports get as webp

//Converting between a string of 0010101001's and binary back and forth is probably inefficient
//TODO: get rid of this function
function toBinStr_old(bits){
	var data = '';
	var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : '';
	bits = pad + bits;
	for(var i = 0; i < bits.length; i+= 8){
		data += String.fromCharCode(parseInt(bits.substr(i,8),2))
	}
	return data;
}

function generateEBML_old(json){
	var ebml = '';
	for(var i = 0; i < json.length; i++){
		var data = json[i].data;
		if(typeof data == 'object') data = generateEBML_old(data);
		if(typeof data == 'number') data = toBinStr_old(data.toString(2));

		var len = data.length;
		var zeroes = Math.ceil(Math.ceil(Math.log(len)/Math.log(2))/8);
		var size_str = len.toString(2);
		var padded = (new Array((zeroes * 7 + 7 + 1) - size_str.length)).join('0') + size_str;
		var size = (new Array(zeroes)).join('0') + '1' + padded;

		ebml += toBinStr_old(json[i].id.toString(2)) + toBinStr_old(size) + data;

	}
	return ebml;
}

//woot, a function that's actually written for this project!
//this parses some json markup and makes it into that binary magic
//which can then get shoved into the matroska comtainer (peaceably)

function makeSimpleBlock(data){
	var flags = 0;
	if (data.keyframe) flags |= 128;
	if (data.invisible) flags |= 8;
	if (data.lacing) flags |= (data.lacing << 1);
	if (data.discardable) flags |= 1;
	if (data.trackNum > 127) {
		throw "TrackNumber > 127 not supported";
	}
	var out = [data.trackNum | 0x80, data.timecode >> 8, data.timecode & 0xff, flags].map(function(e){
		return String.fromCharCode(e)
	}).join('') + data.frame;

	return out;
}

// here's something else taken verbatim from weppy, awesome rite?

function parseWebP(riff){
	var VP8 = riff.RIFF[0].WEBP[0];

	var frame_start = VP8.indexOf('\x9d\x01\x2a'); //A VP8 keyframe starts with the 0x9d012a header
	for(var i = 0, c = []; i < 4; i++) c[i] = VP8.charCodeAt(frame_start + 3 + i);

	var width, horizontal_scale, height, vertical_scale, tmp;

	//the code below is literally copied verbatim from the bitstream spec
	tmp = (c[1] << 8) | c[0];
	width = tmp & 0x3FFF;
	horizontal_scale = tmp >> 14;
	tmp = (c[3] << 8) | c[2];
	height = tmp & 0x3FFF;
	vertical_scale = tmp >> 14;
	return {
		width: width,
		height: height,
		data: VP8,
		riff: riff
	}
}

// i think i'm going off on a riff by pretending this is some known
// idiom which i'm making a casual and brilliant pun about, but since
// i can't find anything on google which conforms to this idiomatic
// usage, I'm assuming this is just a consequence of some psychotic
// break which makes me make up puns. well, enough riff-raff (aha a
// rescue of sorts), this function was ripped wholesale from weppy

function parseRIFF(string){
	var offset = 0;
	var chunks = {};

	while (offset < string.length) {
		var id = string.substr(offset, 4);
		var len = parseInt(string.substr(offset + 4, 4).split('').map(function(i){
			var unpadded = i.charCodeAt(0).toString(2);
			return (new Array(8 - unpadded.length + 1)).join('0') + unpadded
		}).join(''),2);
		var data = string.substr(offset + 4 + 4, len);
		offset += 4 + 4 + len;
		chunks[id] = chunks[id] || [];

		if (id == 'RIFF' || id == 'LIST') {
			chunks[id].push(parseRIFF(data));
		} else {
			chunks[id].push(data);
		}
	}
	return chunks;
}

// here's a little utility function that acts as a utility for other functions
// basically, the only purpose is for encoding "Duration", which is encoded as
// a double (considerably more difficult to encode than an integer)
function doubleToString(num){
	return [].slice.call(
		new Uint8Array(
			(
				new Float64Array([num]) //create a float64 array
			).buffer) //extract the array buffer
		, 0) // convert the Uint8Array into a regular array
		.map(function(e){ //since it's a regular array, we can now use map
			return String.fromCharCode(e) // encode all the bytes individually
		})
		.reverse() //correct the byte endianness (assume it's little endian for now)
		.join('') // join the bytes in holy matrimony as a string
}

function WhammyVideo(speed, quality){ // a more abstract-ish API
	this.frames = [];
	this.duration = 1000 / speed;
	this.quality = quality || 0.8;
}

WhammyVideo.prototype.add = function(frame, duration){
	var cnv = null;
	var ctx = null;
	
	if(typeof duration != 'undefined' && this.duration) throw "you can't pass a duration if the fps is set";
	if(typeof duration == 'undefined' && !this.duration) throw "if you don't have the fps set, you ned to have durations here."
	if('canvas' in frame){ //CanvasRenderingContext2D		
		ctx = frame;
		cnv = frame.canvas
		frame = cnv;
	}
	if(chr){
		if('toDataURL' in frame){
			frame = frame.toDataURL('image/webp', this.quality)
		}else if(typeof frame != "string"){
			throw "frame must be a a HTMLCanvasElement, a CanvasRenderingContext2D or a DataURI formatted string"
		}
	}
	if (!(/^data:image\/webp;base64,/ig).test(frame)) {	
		if(!chr){	
	    	var config = new Object();
			config.target_size = 0;
			config.target_PSNR = 0;
			config.method = 3;
			config.sns_strength = 50;
			config.filter_strength = 20;
			config.filter_sharpness = 0;
			config.filter_type = 1;
			config.partitions = 0;
			config.segments = 4;
			config.pass = 1;
			config.show_compressed = 0;
			config.preprocessing = 0;
			config.autofilter = 0;
			config.extra_info_type = 0;
			config.preset = 0;

	        var inputData = ctx.getImageData(0, 0, cnv.width, cnv.height).data;
	        var out = {output:''};
	        var encoder = new WebPEncoder();

	        encoder.WebPEncodeConfig(config);
	        
	        var size = encoder.WebPEncodeRGBA(inputData, cnv.width, cnv.height, cnv.width * 4, this.quality * 100, out);
	        
	        //console.log(out.output[3]);	        
	        //console.log('data:image/webp;base64,' + btoa(out.output));
	        
	        frame = 'data:image/webp;base64,' + btoa(out.output);
		}else{
			throw "Input must be formatted properly as a base64 encoded DataURI of type image/webp";
		}
	}
	this.frames.push({
		image: frame,
		duration: duration || this.duration
	})
}

WhammyVideo.prototype.compile = function(outputAsArray){
	return new toWebM(this.frames.map(function(frame){
		var webp = parseWebP(parseRIFF(atob(frame.image.slice(23))));
		webp.duration = frame.duration;
		return webp;
	}), outputAsArray)
}

return {
	Video: WhammyVideo,
	fromImageArray: function(images, fps, outputAsArray){
		return toWebM(images.map(function(image){
			var webp = parseWebP(parseRIFF(atob(image.slice(23))))
			webp.duration = 1000 / fps;
			return webp;
		}), outputAsArray)
	},
	toWebM: toWebM
	// expose methods of madness
}
}//)()

window.Whammy = w();

//Copyright 2011 Google Inc.
//
// This code is licensed under the same terms as WebM:
//  Software License Agreement:  http://www.webmproject.org/license/software/
//  Additional IP Rights Grant:  http://www.webmproject.org/license/additional/
// -----------------------------------------------------------------------------
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND 
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED 
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. 
// IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, 
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, 
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY 
// OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING 
// NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, 
// EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// -----------------------------------------------------------------------------
//
// Copyright 2011 Dominik Homberger
// Libwebp Javascript / libwebpjs - the libwebp implementation in javascript (v0.1.3)
//
// Author: Dominik Homberger (dominik.homberger@googlemail.com)

eval(function(p,a,c,k,e,r){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)r[e(c)]=k[c]||e(c);k=[function(e){return r[e]}];e=function(){return'\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('1b fA=(1e fA(){1b dd=(1e(){1b o=fB;1b r=0;1b s=1;1b t=2;1b u=6;1b x=7z;1b y=fB;1b z=64;1b A=6H*8;1b B=2*o;1b C=3;1b D=8z;1b E=16;1b F=Cy;1b G=13;if(F>y)3k("4d: Cz is fC CA");if((o<<1)>(1<<E))3k("4d: CB is fC lW");if(G>E-1)3k("4d: CC is fC lW");if(G<8||D!=8z)3k("4d: CD fC CE");1b H=F;1b I=1<<G;1b J=I-1;1b K=o-1;1b L=0;1b M=fD;1b N=D+C+1;1b O=o-N;1b P=1;1b Q=15;1b R=7;1b S=29;1b T=1I;1b U=1I;1b V=T+1+S;1b W=30;1b X=19;1b Y=16;1b Z=17;1b de=18;1b df=2*V+1;1b dg=1t((G+C-1)/C,10);1b dh;1b di,9r;1b dj;1b dk=1i;1b dl,3D;1b dm;1b dn;1b dp;1b dq;1b dr;1b ds;1b dt;1b du;1b dv;1b dw;1b dx;1b dy;1b dz;1b dA;1b dB;1b dC;1b dD;1b dE;1b dF;1b dG;1b dH;1b dI;1b dJ;1b dK;1b dL;1b dM;1b dN;1b dO;1b dP;1b dQ;1b dR;1b dS;1b dT;1b dU;1b dV;1b dW;1b dX;1b dY;1b dZ;1b ea;1b eb;1b ec;1b ed;1b ee;1b ef;1b eg;1b eh;1b ei;1b ej;1b ek;1b el=1e(){1q.fc=0;1q.dl=0};1b em=1e(){1q.9s=1i;1q.9t=1i;1q.at=1i;1q.au=0;1q.av=0;1q.aw=0;1q.5V=0};1b en=1e(a,b,c,d){1q.lX=a;1q.lY=b;1q.lZ=c;1q.m0=d};1b eo=1e(){1q.6I=1i;1q.7A=0;1q.it=1c 1d(A);1q.fE=0};1b ep=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];1b eq=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];1b er=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7];1b es=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];1b et=[1c en(0,0,0,0),1c en(4,4,8,4),1c en(4,5,16,8),1c en(4,6,32,32),1c en(4,4,16,16),1c en(8,16,32,32),1c en(8,16,128,128),1c en(8,32,128,1I),1c en(32,128,8z,6H),1c en(32,8z,8z,fD)];1b eu=1e(a){1b i;if(!a)a=u;1k if(a<1)a=1;1k if(a>9)a=9;dH=a;dj=ax;dD=ax;if(dk!=1i)1f;dh=di=9r=1i;dk=1c 1d(A);dn=1c 1d(B);dp=1c 1d(H);dq=1c 1d(y+z);dr=1c 1d(1<<E);dK=1c 1d(df);1g(i=0;i<df;i++)dK[i]=1c el();dL=1c 1d(2*W+1);1g(i=0;i<2*W+1;i++)dL[i]=1c el();dM=1c 1d(V+2);1g(i=0;i<V+2;i++)dM[i]=1c el();dN=1c 1d(W);1g(i=0;i<W;i++)dN[i]=1c el();dO=1c 1d(2*X+1);1g(i=0;i<2*X+1;i++)dO[i]=1c el();dP=1c em();dQ=1c em();dR=1c em();dS=1c 1d(Q+1);dT=1c 1d(2*V+1);dW=1c 1d(2*V+1);dX=1c 1d(D-C+1);dY=1c 1d(iu);dZ=1c 1d(S);ea=1c 1d(W);eb=1c 1d(1t(F/8,10))};1b ev=1e(){dh=di=9r=1i;dk=1i;dn=1i;dp=1i;dq=1i;dr=1i;dK=1i;dL=1i;dM=1i;dN=1i;dO=1i;dP=1i;dQ=1i;dR=1i;dS=1i;dT=1i;dW=1i;dX=1i;dY=1i;dZ=1i;ea=1i;eb=1i};1b ew=1e(p){p.6I=dh;dh=p};1b ex=1e(){1b p;if(dh!=1i){p=dh;dh=dh.6I}1k p=1c eo();p.6I=1i;p.7A=p.fE=0;1f p};1b ey=1e(i){1f dr[o+i]};1b ez=1e(i,a){1f dr[o+i]=a};1b eA=1e(c){dk[3D+dl++]=c;if(3D+dl==A)fg()};1b eB=1e(w){w&=fF;if(3D+dl<A-2){dk[3D+dl++]=(w&1v);dk[3D+dl++]=(w>>>8)}1k{eA(w&1v);eA(w>>>8)}};1b eC=1e(){dv=((dv<<dg)^(dn[dB+C-1]&1v))&J;dw=ey(dv);dr[dB&K]=dw;ez(dv,dB)};1b eD=1e(c,a){fd(a[c].fc,a[c].dl)};1b eE=1e(a){1f(a<1I?dY[a]:dY[1I+(a>>7)])&1v};1b eF=1e(a,n,m){1f a[n].fc<a[m].fc||(a[n].fc==a[m].fc&&dW[n]<=dW[m])};1b eG=1e(a,b,n){1b i;1b l=ej.1w;1g(i=0;i<n&&ek<l;i+=1){a[b+i]=ej[ek++]}1f i};1b eH=1e(){1b j;1g(j=0;j<I;j++)dr[o+j]=0;dG=et[dH].lY;dI=et[dH].lX;if(!x)dJ=et[dH].lZ;dF=et[dH].m0;dB=0;du=0;dE=eG(dn,0,2*o);if(dE<=0){dD=7z;dE=0;1f}dD=ax;1s(dE<N&&!dD)eJ();dv=0;1g(j=0;j<C-1;j++){dv=((dv<<dg)^(dn[j]&1v))&J}};1b eI=1e(a){1b b=dF;1b c=dB;1b d;1b e;1b f=dA;1b g=(dB>O?dB-O:L);1b h=dB+D;1b i=dn[c+f-1];1b j=dn[c+f];if(dA>=dI)b>>=2;do{d=a;if(dn[d+f]!=j||dn[d+f-1]!=i||dn[d]!=dn[c]||dn[++d]!=dn[c+1]){4n}c+=2;d++;do{}1s(dn[++c]==dn[++d]&&dn[++c]==dn[++d]&&dn[++c]==dn[++d]&&dn[++c]==dn[++d]&&dn[++c]==dn[++d]&&dn[++c]==dn[++d]&&dn[++c]==dn[++d]&&dn[++c]==dn[++d]&&c<h);e=D-(h-c);c=h-D;if(e>f){dC=a;f=e;if(x){if(e>=D)1Q}1k{if(e>=dJ)1Q}i=dn[c+f-1];j=dn[c+f]}}1s((a=dr[a&K])>g&&--b!=0);1f f};1b eJ=1e(){1b n,m;1b a=B-dE-dB;if(a==-1){a--}1k if(dB>=o+O){1g(n=0;n<o;n++)dn[n]=dn[n+o];dC-=o;dB-=o;du-=o;1g(n=0;n<I;n++){m=ey(n);ez(n,m>=o?m-o:L)}1g(n=0;n<o;n++){m=dr[n];dr[n]=(m>=o?m-o:L)}a+=o}if(!dD){n=eG(dn,dB+dE,a);if(n<=0)dD=7z;1k dE+=n}};1b eK=1e(){1s(dE!=0&&di==1i){1b a;eC();if(dw!=L&&dB-dw<=O){dz=eI(dw);if(dz>dE)dz=dE}if(dz>=C){a=fa(dB-dC,dz-C);dE-=dz;if(dz<=dG){dz--;do{dB++;eC()}1s(--dz!=0);dB++}1k{dB+=dz;dz=0;dv=dn[dB]&1v;dv=((dv<<dg)^(dn[dB+1]&1v))&J}}1k{a=fa(0,dn[dB]&1v);dE--;dB++}if(a){eZ(0);du=dB}1s(dE<N&&!dD)eJ()}};1b eL=1e(){1s(dE!=0&&di==1i){eC();dA=dz;dx=dC;dz=C-1;if(dw!=L&&dA<dG&&dB-dw<=O){dz=eI(dw);if(dz>dE)dz=dE;if(dz==C&&dB-dC>M){dz--}}if(dA>=C&&dz<=dA){1b a;a=fa(dB-1-dx,dA-C);dE-=dA-1;dA-=2;do{dB++;eC()}1s(--dA!=0);dy=0;dz=C-1;dB++;if(a){eZ(0);du=dB}}1k if(dy!=0){if(fa(0,dn[dB-1]&1v)){eZ(0);du=dB}dB++;dE--}1k{dy=1;dB++;dE--}1s(dE<N&&!dD)eJ()}};1b eM=1e(){if(dD)1f;ds=0;dt=0;eP();eH();di=1i;dl=0;3D=0;if(dH<=3){dA=C-1;dz=0}1k{dz=C-1;dy=0}dm=ax};1b eN=1e(a,b,c){1b n;if(!dj){eM();dj=7z;if(dE==0){dm=7z;1f 0}}if((n=eO(a,b,c))==c)1f c;if(dm)1f n;if(dH<=3)eK();1k eL();if(dE==0){if(dy!=0){fa(0,dn[dB-1]&1v)}eZ(1);dm=7z}1f n+eO(a,n+b,c-n)};1b eO=1e(a,b,c){1b n,i,j;n=0;1s(di!=1i&&n<c){i=c-n;if(i>di.7A)i=di.7A;1g(j=0;j<i;j++){a[b+n+j]=di.it[di.fE+j]}di.fE+=i;di.7A-=i;n+=i;if(di.7A==0){1b p;p=di;di=di.6I;ew(p)}}if(n==c){1f n}if(3D<dl){i=c-n;if(i>dl-3D){i=dl-3D}1g(j=0;j<i;j++){a[b+n+j]=dk[3D+j]}3D+=i;n+=i;if(dl==3D){dl=3D=0}}1f n};1b eP=1e(){1b n;1b a;1b b;1b c;1b d;if(dN[0].dl!=0)1f;dP.9s=dK;dP.9t=dM;dP.at=ep;dP.au=T+1;dP.av=V;dP.aw=Q;dP.5V=0;dQ.9s=dL;dQ.9t=dN;dQ.at=eq;dQ.au=0;dQ.av=W;dQ.aw=Q;dQ.5V=0;dR.9s=dO;dR.9t=1i;dR.at=er;dR.au=0;dR.av=X;dR.aw=R;dR.5V=0;b=0;1g(c=0;c<S-1;c++){dZ[c]=b;1g(n=0;n<(1<<ep[c]);n++)dX[b++]=c}dX[b-1]=c;d=0;1g(c=0;c<16;c++){ea[c]=d;1g(n=0;n<(1<<eq[c]);n++){dY[d++]=c}}d>>=7;1g(;c<W;c++){ea[c]=d<<7;1g(n=0;n<(1<<(eq[c]-7));n++)dY[1I+d++]=c}1g(a=0;a<=Q;a++)dS[a]=0;n=0;1s(n<=143){dM[n++].dl=8;dS[8]++}1s(n<=1a){dM[n++].dl=9;dS[9]++}1s(n<=iv){dM[n++].dl=7;dS[7]++}1s(n<=m1){dM[n++].dl=8;dS[8]++}eT(dM,V+1);1g(n=0;n<W;n++){dN[n].dl=5;dN[n].fc=fe(n,5)}eQ()};1b eQ=1e(){1b n;1g(n=0;n<V;n++)dK[n].fc=0;1g(n=0;n<W;n++)dL[n].fc=0;1g(n=0;n<X;n++)dO[n].fc=0;dK[U].fc=1;eh=ei=0;ec=ed=ee=0;ef=0;eg=1};1b eR=1e(a,k){1b v=dT[k];1b j=k<<1;1s(j<=dU){if(j<dU&&eF(a,dT[j+1],dT[j]))j++;if(eF(a,v,dT[j]))1Q;dT[k]=dT[j];k=j;j<<=1}dT[k]=v};1b eS=1e(a){1b b=a.9s;1b c=a.at;1b d=a.au;1b e=a.5V;1b g=a.aw;1b i=a.9t;1b h;1b n,m;1b j;1b k;1b f;1b l=0;1g(j=0;j<=Q;j++)dS[j]=0;b[dT[dV]].dl=0;1g(h=dV+1;h<df;h++){n=dT[h];j=b[b[n].dl].dl+1;if(j>g){j=g;l++}b[n].dl=j;if(n>e)4n;dS[j]++;k=0;if(n>=d)k=c[n-d];f=b[n].fc;eh+=f*(j+k);if(i!=1i)ei+=f*(i[n].dl+k)}if(l==0)1f;do{j=g-1;1s(dS[j]==0)j--;dS[j]--;dS[j+1]+=2;dS[g]--;l-=2}1s(l>0);1g(j=g;j!=0;j--){n=dS[j];1s(n!=0){m=dT[--h];if(m>e)4n;if(b[m].dl!=j){eh+=(j-b[m].dl)*b[m].fc;b[m].fc=j}n--}}};1b eT=1e(a,b){1b c=1c 1d(Q+1);1b d=0;1b e;1b n;1g(e=1;e<=Q;e++){d=((d+dS[e-1])<<1);c[e]=d}1g(n=0;n<=b;n++){1b f=a[n].dl;if(f==0)4n;a[n].fc=fe(c[f]++,f)}};1b eU=1e(a){1b b=a.9s;1b c=a.9t;1b d=a.av;1b n,m;1b e=-1;1b f=d;dU=0;dV=df;1g(n=0;n<d;n++){if(b[n].fc!=0){dT[++dU]=e=n;dW[n]=0}1k b[n].dl=0}1s(dU<2){1b g=dT[++dU]=(e<2?++e:0);b[g].fc=1;dW[g]=0;eh--;if(c!=1i)ei-=c[g].dl}a.5V=e;1g(n=dU>>1;n>=1;n--)eR(b,n);do{n=dT[P];dT[P]=dT[dU--];eR(b,P);m=dT[P];dT[--dV]=n;dT[--dV]=m;b[f].fc=b[n].fc+b[m].fc;if(dW[n]>dW[m]+1)dW[f]=dW[n];1k dW[f]=dW[m]+1;b[n].dl=b[m].dl=f;dT[P]=f++;eR(b,P)}1s(dU>=2);dT[--dV]=dT[P];eS(a);eT(b,e)};1b eV=1e(a,b){1b n;1b c=-1;1b d;1b e=a[0].dl;1b f=0;1b g=7;1b h=4;if(e==0){g=138;h=3}a[b+1].dl=fF;1g(n=0;n<=b;n++){d=e;e=a[n+1].dl;if(++f<g&&d==e)4n;1k if(f<h)dO[d].fc+=f;1k if(d!=0){if(d!=c)dO[d].fc++;dO[Y].fc++}1k if(f<=10)dO[Z].fc++;1k dO[de].fc++;f=0;c=d;if(e==0){g=138;h=3}1k if(d==e){g=6;h=3}1k{g=7;h=4}}};1b eW=1e(a,b){1b n;1b c=-1;1b d;1b e=a[0].dl;1b f=0;1b g=7;1b h=4;if(e==0){g=138;h=3}1g(n=0;n<=b;n++){d=e;e=a[n+1].dl;if(++f<g&&d==e){4n}1k if(f<h){do{eD(d,dO)}1s(--f!=0)}1k if(d!=0){if(d!=c){eD(d,dO);f--}eD(Y,dO);fd(f-3,2)}1k if(f<=10){eD(Z,dO);fd(f-3,3)}1k{eD(de,dO);fd(f-11,7)}f=0;c=d;if(e==0){g=138;h=3}1k if(d==e){g=6;h=3}1k{g=7;h=4}}};1b eX=1e(){1b a;eV(dK,dP.5V);eV(dL,dQ.5V);eU(dR);1g(a=X-1;a>=3;a--){if(dO[es[a]].dl!=0)1Q}eh+=3*(a+1)+5+5+4;1f a};1b eY=1e(a,b,c){1b d;fd(a-8A,5);fd(b-1,5);fd(c-4,4);1g(d=0;d<c;d++){fd(dO[es[d]].dl,3)}eW(dK,a-1);eW(dL,b-1)};1b eZ=1e(a){1b b,ay;1b c;1b d;d=dB-du;eb[ee]=ef;eU(dP);eU(dQ);c=eX();b=(eh+3+7)>>3;ay=(ei+3+7)>>3;if(ay<=b)b=ay;if(d+4<=b&&du>=0){1b i;fd((r<<1)+a,3);ff();eB(d);eB(~d);1g(i=0;i<d;i++)eA(dn[du+i])}1k if(ay==b){fd((s<<1)+a,3);fb(dM,dN)}1k{fd((t<<1)+a,3);eY(dP.5V+1,dQ.5V+1,c+1);fb(dK,dL)}eQ();if(a!=0)ff()};1b fa=1e(a,b){dq[ec++]=b;if(a==0){dK[b].fc++}1k{a--;dK[dX[b]+T+1].fc++;dL[eE(a)].fc++;dp[ed++]=a;ef|=eg}eg<<=1;if((ec&7)==0){eb[ee++]=ef;ef=0;eg=1}if(dH>2&&(ec&CF)==0){1b c=ec*8;1b d=dB-du;1b e;1g(e=0;e<W;e++){c+=dL[e].fc*(5+eq[e])}c>>=3;if(ed<1t(ec/2,10)&&c<1t(d/2,10))1f 7z}1f(ec==F-1||ed==H)};1b fb=1e(a,b){1b c;1b d;1b e=0;1b f=0;1b g=0;1b h=0;1b i;1b j;if(ec!=0)do{if((e&7)==0)h=eb[g++];d=dq[e++]&1v;if((h&1)==0){eD(d,a)}1k{i=dX[d];eD(i+T+1,a);j=ep[i];if(j!=0){d-=dZ[i];fd(d,j)}c=dp[f++];i=eE(c);eD(i,b);j=eq[i];if(j!=0){c-=ea[i];fd(c,j)}}h>>=1}1s(e<ec);eD(U,a)};1b fc=16;1b fd=1e(a,b){if(dt>fc-b){ds|=(a<<dt);eB(ds);ds=(a>>(fc-dt));dt+=b-fc}1k{ds|=a<<dt;dt+=b}};1b fe=1e(a,b){1b c=0;do{c|=a&1;a>>=1;c<<=1}1s(--b>0);1f c>>1};1b ff=1e(){if(dt>8){eB(ds)}1k if(dt>0){eA(ds)}ds=0;dt=0};1b fg=1e(){if(dl!=0){1b q,i;q=ex();if(di==1i)di=9r=q;1k 9r=9r.6I=q;q.7A=dl-3D;1g(i=0;i<q.7A;i++)q.it[i]=dk[3D+i];dl=3D=0}};1b fh=1e(a,b){1b i,j;ej=a;ek=0;if(4o b=="4I"){b=u}eu(b);1b c=[0];1b d=[];1s((i=eN(c,0,c.1w))>0){d.2c(c[0])}ej=1i;1f d};1f fh})();1b fi=(1e(){1b D=fB;1b E=0;1b F=1;1b G=2;1b H=9;1b I=6;1b J=fB;1b K=64;1b L;1b M;1b N=1i;1b O;1b P,CG;1b Q;1b R;1b S;1b T;1b U;1b V;1b W,fG;1b X,7B;1b Y;1b Z;1b de=1c 1d(CH,CI,CJ,CK,CL,CM,CN,CO,CP,CQ,CR,CS,CT,CU,az,CV,fF);1b df=1c 1d(3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,3s,3E,4p,8z,0,0);1b dg=1c 1d(0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,99,99);1b dh=1c 1d(1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,3P,8A,m2,CW,m3,m4,m5,CX,CY,CZ,D0,D1,D2,D3,D4);1b di=1c 1d(0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13);1b dj=1c 1d(16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15);1b dk=1e(){1q.6I=1i;1q.aA=1i};1b dl=1e(){1q.e=0;1q.b=0;1q.n=0;1q.t=1i};1b dm=1e(b,n,s,d,e,l){1q.7C=16;1q.m6=aB;1q.4e=0;1q.6J=1i;1q.m=0;{1b a;1b c=1c 1d(1q.7C+1);1b m;1b f;1b g;1b h;1b i;1b j;1b k;1b t=1c 1d(1q.7C+1);1b p;1b A;1b q;1b r=1c dl();1b u=1c 1d(1q.7C);1b v=1c 1d(1q.m6);1b w;1b x=1c 1d(1q.7C+1);1b B;1b y;1b z;1b o;1b C;C=1q.6J=1i;1g(i=0;i<c.1w;i++)c[i]=0;1g(i=0;i<t.1w;i++)t[i]=0;1g(i=0;i<u.1w;i++)u[i]=1i;1g(i=0;i<v.1w;i++)v[i]=0;1g(i=0;i<x.1w;i++)x[i]=0;m=n>1I?b[1I]:1q.7C;p=b;A=0;i=n;do{c[p[A]]++;A++}1s(--i>0);if(c[0]==n){1q.6J=1i;1q.m=0;1q.4e=0;1f}1g(j=1;j<=1q.7C;j++)if(c[j]!=0)1Q;k=j;if(l<j)l=j;1g(i=1q.7C;i!=0;i--)if(c[i]!=0)1Q;g=i;if(l>i)l=i;1g(y=1<<j;j<i;j++,y<<=1)if((y-=c[j])<0){1q.4e=2;1q.m=l;1f}if((y-=c[i])<0){1q.4e=2;1q.m=l;1f}c[i]+=y;x[1]=j=0;p=c;A=1;B=2;1s(--i>0)x[B++]=(j+=p[A++]);p=b;A=0;i=0;do{if((j=p[A++])!=0)v[x[j]++]=i}1s(++i<n);n=x[g];x[0]=i=0;p=v;A=0;h=-1;w=t[0]=0;q=1i;z=0;1g(;k<=g;k++){a=c[k];1s(a-->0){1s(k>w+t[1+h]){w+=t[1+h];h++;z=(z=g-w)>l?l:z;if((f=1<<(j=k-w))>a+1){f-=a+1;B=k;1s(++j<z){if((f<<=1)<=c[++B])1Q;f-=c[B]}}if(w+j>m&&w<m)j=m-w;z=1<<j;t[1+h]=j;q=1c 1d(z);1g(o=0;o<z;o++){q[o]=1c dl()}if(C==1i)C=1q.6J=1c dk();1k C=C.6I=1c dk();C.6I=1i;C.aA=q;u[h]=q;if(h>0){x[h]=i;r.b=t[h];r.e=16+j;r.t=q;j=(i&((1<<w)-1))>>(w-t[h]);u[h-1][j].e=r.e;u[h-1][j].b=r.b;u[h-1][j].n=r.n;u[h-1][j].t=r.t}}r.b=k-w;if(A>=n)r.e=99;1k if(p[A]<s){r.e=(p[A]<1I?16:15);r.n=p[A++]}1k{r.e=e[p[A]-s];r.n=d[p[A++]-s]}f=1<<(k-w);1g(j=i>>w;j<z;j+=f){q[j].e=r.e;q[j].b=r.b;q[j].n=r.n;q[j].t=r.t}1g(j=1<<(k-1);(i&j)!=0;j>>=1)i^=j;i^=j;1s((i&((1<<w)-1))!=x[h]){w-=t[h];h--}}}1q.m=t[1];1q.4e=((y!=0&&g!=1)?1:0)}};1b dn=1e(){if(Y.1w==Z)1f-1;1f Y[Z++]};1b dp=1e(n){1s(R<n){Q|=dn()<<R;R+=8}};1b dq=1e(n){1f Q&de[n]};1b dr=1e(n){Q>>=n;R-=n};1b ds=1e(a,b,c){1b e;1b t;1b n;if(c==0)1f 0;n=0;1g(;;){dp(X);t=W.aA[dq(X)];e=t.e;1s(e>16){if(e==99)1f-1;dr(t.b);e-=16;dp(e);t=t.t[dq(e)];e=t.e}dr(t.b);if(e==16){M&=D-1;a[b+n++]=L[M++]=t.n;if(n==c)1f c;4n}if(e==15)1Q;dp(e);U=t.n+dq(e);dr(e);dp(7B);t=fG.aA[dq(7B)];e=t.e;1s(e>16){if(e==99)1f-1;dr(t.b);e-=16;dp(e);t=t.t[dq(e)];e=t.e}dr(t.b);dp(e);V=M-t.n-dq(e);dr(e);1s(U>0&&n<c){U--;V&=D-1;M&=D-1;a[b+n++]=L[M++]=L[V++]}if(n==c)1f c}S=-1;1f n};1b dt=1e(a,b,c){1b n;n=R&7;dr(n);dp(16);n=dq(16);dr(16);dp(16);if(n!=((~Q)&fF))1f-1;dr(16);U=n;n=0;1s(U>0&&n<c){U--;M&=D-1;dp(8);a[b+n++]=L[M++]=dq(8);dr(8)}if(U==0)S=-1;1f n};1b du=1e(a,b,c){if(N==1i){1b i;1b l=1c 1d(aB);1b h;1g(i=0;i<144;i++)l[i]=8;1g(;i<1I;i++)l[i]=9;1g(;i<iw;i++)l[i]=7;1g(;i<aB;i++)l[i]=8;P=7;h=1c dm(l,aB,8A,df,dg,P);if(h.4e!=0){3k("m7 4d: "+h.4e);1f-1}N=h.6J;P=h.m;1g(i=0;i<30;i++)l[i]=5;1b d=5;h=1c dm(l,30,0,dh,di,d);if(h.4e>1){N=1i;3k("m7 4d: "+h.4e);1f-1}O=h.6J;d=h.m}W=N;fG=O;X=P;7B=d;1f ds(a,b,c)};1b dv=1e(a,b,c){1b i;1b j;1b l;1b n;1b t;1b d;1b e;1b f;1b g=1c 1d(ix+30);1b h;1g(i=0;i<g.1w;i++)g[i]=0;dp(5);e=8A+dq(5);dr(5);dp(5);f=1+dq(5);dr(5);dp(4);d=4+dq(4);dr(4);if(e>ix||f>30)1f-1;1g(j=0;j<d;j++){dp(3);g[dj[j]]=dq(3);dr(3)}1g(;j<19;j++)g[dj[j]]=0;X=7;h=1c dm(g,19,19,1i,1i,X);if(h.4e!=0)1f-1;W=h.6J;X=h.m;n=e+f;i=l=0;1s(i<n){dp(X);t=W.aA[dq(X)];j=t.b;dr(j);j=t.n;if(j<16)g[i++]=l=j;1k if(j==16){dp(2);j=3+dq(2);dr(2);if(i+j>n)1f-1;1s(j-->0)g[i++]=l}1k if(j==17){dp(3);j=3+dq(3);dr(3);if(i+j>n)1f-1;1s(j-->0)g[i++]=0;l=0}1k{dp(7);j=11+dq(7);dr(7);if(i+j>n)1f-1;1s(j-->0)g[i++]=0;l=0}}X=H;h=1c dm(g,e,8A,df,dg,X);if(X==0)h.4e=1;if(h.4e!=0){if(h.4e==1);1f-1}W=h.6J;X=h.m;1g(i=0;i<f;i++)g[i]=g[i+e];7B=I;h=1c dm(g,f,0,dh,di,7B);fG=h.6J;7B=h.m;if(7B==0&&e>8A){1f-1}if(h.4e==1){}if(h.4e!=0)1f-1;1f ds(a,b,c)};1b dw=1e(){1b i;if(L==1i)L=1c 1d(2*D);M=0;Q=0;R=0;S=-1;T=ax;U=V=0;W=1i};1b dx=1e(a,b,c){1b n,i;n=0;1s(n<c){if(T&&S==-1)1f n;if(U>0){if(S!=E){1s(U>0&&n<c){U--;V&=D-1;M&=D-1;a[b+n++]=L[M++]=L[V++]}}1k{1s(U>0&&n<c){U--;M&=D-1;dp(8);a[b+n++]=L[M++]=dq(8);dr(8)}if(U==0)S=-1}if(n==c)1f n}if(S==-1){if(T)1Q;dp(1);if(dq(1)!=0)T=7z;dr(1);dp(2);S=dq(2);dr(2);W=1i;U=0}fH(S){3l 0:i=dt(a,b+n,c-n);1Q;3l 1:if(W!=1i)i=ds(a,b+n,c-n);1k i=du(a,b+n,c-n);1Q;3l 2:if(W!=1i)i=ds(a,b+n,c-n);1k i=dv(a,b+n,c-n);1Q;fI:i=-1;1Q}if(i==-1){if(T)1f 0;1f-1}n+=i}1f n};1b dy=1e(a){1b i,j;dw();Y=a;Z=0;1b b=[0];1b c=[];1s((i=dx(b,0,b.1w))>0){c.2c(b[0])}Y=1i;1f c};1f dy})();1b fj=1e(c){1b a=1,b=0;1b i;1b d=c.1w;1b e=D5;1g(i=0;i<d;i+=1){a=(a+c[i])%e;b=(b+a)%e}1f(b<<16)|a};1b fk=1e(a,b){1b i;1b c=fj(a);1b d=dd(a,b);a=d;a.D6(D7,D8);1g(i=0;i<4;++i)a.2c(c>>i*8&25);1f a};1b fl=1e(a){if(a.1w<6){fJ"m8: iy m9 aC";}1b b=fi(a.8B(2,a.1w-4));if(a.1w>6&&b.1w===0){fJ"m8: ma to mb mc 6K";}1f b};1f{\'D9\':dd,\'mb\':fi,\'md\':fk,\'me\':fl}})();1b fK=0,iz=0,1h=0,iA=0,aD=0;1b 8C=fK;1b 1m=fK;1b 4q=iz;1b 5d=iz;1b 6L=1h;1b 2C=1h;1b 3b=iA;1b iB=iA;1b aE=0.Da;1b 3c=0;1b 3t=0;1b 4J=iB;1e Db(a){if(a iC 1d){1f a}if(a iC Dc){1b b={};1g(1b c in a){if(a.Dd(c)&&!(a iC 1d))b[c]=(a[c])}1f b}fJ 1c 3k("ma to De Df! Dg Dh Di\'t Dj.");}1e 1n(a){1f mf.9u(mf.Dk(a))}1e Dl(a){1b b=1c 1d();1b c=a.1w;1g(i=0;i<c;++i)b.2c(a.mg(i));1f b}1e iD(a,b){1b c=1c 1d();1b i;1g(i=0;i<b;++i)c[i]=\'0\';aF=(a.iE(2)+\'\'+c.iF(""));1f 1t(aF,2)}1e aG(a,b,c){1b i;1g(i=3;i>=0;--i)a[b+(3-i)]=(c>>(8*i))&1v}1e aH(a,b){1f((a[b+0]<<24)|(a[b+1]<<16)|(a[b+2]<<8)|a[b+3])}1e Dm(a){1b i,2Q=\'\';1g(i=3;i>=0;--i)2Q+=\' \'+((a>>(8*i))&1v);3k(2Q)}1e fL(a){1f\'mh\'+a.iE(16)}1e 1u(a,b,c,d,e){if(4o a!=\'mi\'){1g(i=0;i<e;++i)a[b+i]=c[d+i]}1k{if(b>0)3k(\'mi Dn is Do 0\');a=c.8B(d,e);1f a}}1e Dp(a,b,c,d,e){1b f=c.8B(0,d);1b g=c.8B(d,d+e);1b h=c.8B(d+e);a.Dq(0);a.Dr(f,g,h)}1e fM(b,c,d,e,f){1g(i=0;i<f;++i){1b g=b[c+i].1w;1g(1b a=0;a<g;++a)b[c+i][a]=d[e+i][a]}}1e aI(a){1b b=1c 1d();1b c=a.1w;1g(i=0;i<c;++i){b.2c(a[i])}1f b}1e iG(a,b){1b c=1c 1d();c.2c(1n(a));1g(i=0;i<b;++i)c.2c(1n(a));c.2c(0);1f c}1e 8D(a,b){1b c=1c 1d();1g(i=0;i<b;++i)c.2c(a);c.2c(0);1f c}1e Ds(a,b){1b c=1c 1d();c.2c(1n(a));1g(i=0;i<b;++i)c.2c(1n(a));c.2c(0);1f c}1e aJ(a,b){1b c=1c 1d();1g(i=0;i<b;++i)c.2c(a);c.2c(0);1f c}1e 2R(a,b,c,d){1g(i=0;i<d;++i)a[b+i]=c}1e 4f(a,b){1b c=1c 1d();1g(i=0;i<a;++i)c.2c(b);c.2c(0);1f c}1e Dt(a,b){1b c=1c 1d();1g(i=0;i<a;++i)c.2c(\' \');1f c.iF("")}1e 1F(a){1f 1}1e aK(a,b,s,c){1b w=\'\';1g(i=0;i<c;++i)w+=iH.mj(a[b+i]);if(s==w)1f 0;1k 1f 1}1e 1p(a,b){1b c=1c 1d();1g(i=0;i<a;++i)c.2c(b);1f c}1e 9v(a,b){1b c=1c 1d();1g(i=0;i<a;++i)c.2c(1n(b));1f c}1e 3m(b,c){1b d,Du=1c 1d();1g(a=(b.1w-1);a>=0;--a)c=1n(1p(b[a],c));1f c}1e 1y(a){if(!a){fJ 1c Dv(\'1y :P\');}}1e Dw(){1b N=mk;1b O=0,6M=1,7D=2,6N=3,7E=4,7F=5,fN=6,4r=7,aL=8,fO=9;1q.ml={mm:0,6M:1,7D:2,6N:3,7E:4,7F:5,fN:6,4r:7,aL:8,fO:9};1b P={5y:1m,7G:0,2U:1h,3F:1h};1b Q={y:1m,u:1m,v:1m,a:1m,2v:1m,2s:1m,2w:1m,3u:1m,2d:1h,5W:1h,6O:1h,3v:1h,aM:1h,aN:1h,aO:1h,5e:1h};1b R={2e:\'ml\',1z:1h,1B:1h,8E:1h,u:{3w:P,1J:Q},aP:1i,fP:1m};1e 9w(a){1f mn(a,N)}1b T=0,8F=1,2V=2,2x=3,fQ=4,4g=5,8G=6,6P=7;1q.fR={fS:0,8F:1,2V:2,2x:3,fQ:4,4g:5,8G:6,6P:7};1b U={1z:{1l:1h},1B:{1l:1h},mo:{1l:1h},Dx:1h,Dy:1h,Dz:1h,mp:1h};1q.mq=1e(a,b,c){1f mr(a,b,c,N)};1b V={9x:1h,ms:1h,8H:1h,5f:1h,5g:1h,iI:1h,iJ:1h,6Q:1h,5X:1h,5Y:1h,DA:1h,DB:1h,DC:1h};1q.DD={aC:1n(U),1L:1n(R),mt:1n(V)};1q.DE=1e(a){1f mu(a,N)};1b Y={1z:1h,1B:1h,4K:1h,2y:1h,2a:1h,y:1m,u:1m,v:1m,2v:0,2s:0,2w:0,2d:1h,2j:1h,9y:aD,aQ:0,9z:0,8I:0,aR:1h,7H:2C,6K:1m,5Z:0,9x:1h,8H:1h,5f:1h,aS:1h,5g:1h,8J:1h,6Q:1h,5X:1h,5Y:1h,a:1m,3u:0};1e iK(a){1f mv(a,N)};1b Z={9A:1h,iL:1h,iM:1h,iN:iB,4s:1h,iO:1h,fT:1h,aT:1h,aU:1h,mw:1h,mx:1h,7I:1h,my:1h,6a:1m,6b:0,iP:1h,9B:6L,9C:0,9D:6L,9E:0};1b ba={1L:1n(R),9F:1m,9G:1m,aV:1m,aW:0,aX:0,fU:0,7J:1h,8K:1n(V),6c:1n(Z),6d:1n(Z),6R:1n(Z),6e:1n(Z),3G:aD,7K:\'(mz)\',8L:\'(mz)\'};1b bb={1R:1m,1K:1i,3H:1m,5z:1h,2f:2C,3x:2C,6f:1h};1e 2L(a){1f 6g(a,1)};1e mA(a){1y(a);if(a.1K<a.3H){1y(a.1R);1f(a.1R[a.1K++])}a.5z=1;1f 1v}1e iQ(a,b){1b c=2C;1b d=(b+1)<<8;if(a.6f>0){a.3x|=mA(a)<<a.6f;a.6f-=8}c=(a.3x>=d)+0;if(c){a.2f-=b+1;a.3x-=d}1k{a.2f=b}1f c}1e iR(a){1b b=bc[a.2f];a.2f=bd[a.2f];a.3x<<=b;a.6f+=b};1e 2b(a,b){1b c=(a.2f*b)>>8;1b d=iQ(a,c);if(a.2f<DF){iR(a)}1f d};1e mB(a,v){1b b=a.2f>>1;1b c=iQ(a,b);iR(a);1f c?-v:v};1e fV(a,b,c,d){1y(a);1y(b);1y(d);a.2f=1a-1;a.1R=b;a.1K=c;a.3H=d;a.3x=0;a.6f=8;a.5z=0};1b bc=1c 1d(7,6,6,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0);1b bd=1c 1d(127,127,2W,127,3I,2W,2m,127,143,3I,2X,2W,4L,2m,3d,127,135,143,4M,3I,4h,2X,1O,2W,4t,4L,5h,2m,4u,3d,2D,127,131,135,139,143,147,4M,3e,3I,3s,4h,1G,2X,3Q,1O,4N,2W,3E,4t,5i,4L,3f,5h,2k,2m,4p,4u,4O,3d,2E,2D,1A,127,129,131,133,135,137,139,141,143,145,147,149,4M,9H,3e,4v,3I,6S,3s,4P,4h,9I,1G,5A,2X,6h,3Q,5B,1O,6i,4N,5C,2W,3P,3E,5j,4t,3J,5i,1P,4L,2F,3f,2l,5h,5D,2k,2G,2m,3R,4p,9J,4u,fW,4O,aY,3d,3g,2E,3n,2D,2n,1A,1r,127);1e 6g(a,b){1b v=0;1s(b-->0){v|=2b(a,aZ)<<b}1f v};1e 6j(a,b){1b c=6g(a,b);1f 2L(a)?-c:c};1b be=0;1b bf=1;1b bg=2;1b bh=0,9K=1,9L=2,9M=3,fX=4,iS=5,b0=6,fY=7,fZ=8,b1=9,b2=b1+1-bh,b3=bh,9N=9L,9O=9M,9P=9K,DG=b2,mC=4,mD=5,mE=6,DH=7;1b bi=3,6T=4,g0=4,mF=4,b4=8,6k=4,6l=8,5E=3,6U=11,DI=19;1b bj=32;1b bk=(bj*17+bj*9);1b bl=(bj*17);1b bm=(bj*1+8);1b bn=(bm+bj*16+bj);1b bo=(bn+16);1b bp={9Q:1m,9R:1m,iT:1m,7L:2C};1b bq={8M:5d,7M:5d,mG:1m,mH:1m,iU:1m,mI:1m};1b bs={9S:1h,4Q:1h,b5:1h,b6:1p(6T,8C),b7:1p(6T,8C)};1b bt={4w:1p(bi,1m),2M:3m(1c 1d(6k,6l,5E,6U),1m)};1b bu={7N:1h,6V:1h,6m:1h,g1:1h,iV:1p(g0,1h),iW:1p(g0,1h)};1b bv={8N:1h,8O:1h,6n:1h};1b bw={2g:1h,5k:1h,4x:1h};1b bx={g2:1p(2,5d),9T:1p(2,5d),g3:1p(2,5d)};1b by={6W:1h,2o:1h,6o:1h,5F:bv,2S:Y};1b bz={5l:\'fR\',6p:1h,iX:fK,2h:1n(bb),iY:1n(bp),6q:1n(bq),3S:1n(bu),2Y:1n(bs),9U:\'DJ\',6r:1h,8P:1h,9V:1h,6s:by,1S:1h,2Z:1h,g4:1h,g5:1h,b8:1h,9W:1h,3h:1h,2i:9v(b4,bb),mJ:2C,1T:9v(6T,bx),1X:1n(bt),5m:1h,iZ:1m,6X:1m,6Y:1p(4,1m),g6:1m,g7:1m,g8:1m,3y:1n(bw),5F:1n(bv),6t:1m,2M:4q,6Z:1m,7a:1m,7O:1m,7b:1h,7c:1h,7P:1h,5n:1h,4i:1h,1Y:aD,b9:1h,2p:1h,2o:1h,7Q:1m,c0:1p(16,1m),DK:0,j0:1m,1Z:1m,7d:2C,8Q:2C,4y:1h,6o:1h,g9:1p(6T,1m),3T:1m,c1:0,4j:3c,j1:1m,DL:0,mK:1h,8R:1m,j2:0,5G:3c};1e j3(a,b,c){1b d=a.j1;1b e=a.6q.8M;if(b<0||b+c>a.6q.7M){1f 1i}if(b==0){1b f=a.3T;1b g=a.c1;1b h=a.4j;1b i=e*a.6q.7M;d=fA.me(f.8B(g,g+h))}1f(b==0?d:(+b*e))}1b bA=1c 1d(3,4,3,4,4,2,2,1,1);1e mL(a){1b b=1;1b c=a.2e;1b d=a.1z;1b e=a.1B;if(c>=4r){1b f=a.u.1J;1b g=f.2d*e;1b h=f.5W*1t((e+1)/2);1b i=f.6O*1t((e+1)/2);1b j=f.3v*e;b&=(g<=f.aM);b&=(h<=f.aN);b&=(i<=f.aO);b&=(j<=f.5e);b&=(f.2d>=d);b&=(f.5W>=1t(d+1)/2);b&=(f.6O>=1t(d+1)/2);if(f.a){b&=(f.3v>=d)}}1k{1b f=a.u.3w;b&=(f.2U*e<=f.3F);b&=(f.2U>=d*bA[c])}1f b?T:2V}1e mM(a){1b w=a.1z;1b h=a.1B;if(w<=0||h<=0){1f 2V}if(!a.8E&&a.aP==1i){1b b=1m;1b c=0;1b d=a.2e;1b e=1h;1b f=0,3v=0;1b g=0;1b i=3b,5e=0,5H=3b;e=w*bA[d];i=e*h;if(d>=4r){f=1t((w+1)/2);g=f*1t((h+1)/2);if(d==aL){3v=w;5e=3v*h}}5H=i+2*g+5e;if((5H!=5H)){1f 2V}a.aP=b=4f(5H,3c);a.fP=c=0;if(b==1i){1f 8F}if(d>=4r){1b j=a.u.1J;j.y=b;j.2v=c;j.2d=e;j.aM=i;j.u=b;j.2s=c+i;j.5W=f;j.aN=g;j.v=b;j.2w=c+i+g;j.6O=f;j.aO=g;if(d==aL){j.a=b;j.3u=c+i+2*g}j.5e=5e;j.3v=3v}1k{1b j=a.u.3w;j.5y=b;j.7G=c;j.2U=e;j.3F=i}}1f mL(a)}1e j4(w,h,a,b){if(b==1i||w<=0||h<=0){1f 2V}if(a!=1i){if(a.8H){1b c=a.iI;1b d=a.iJ;1b x=a.5f&~1;1b y=a.5g&~1;if(x<0||y<0||c<=0||d<=0||x+c>w||y+d>h){1f 2V}w=c;h=d}if(a.6Q){if(a.5X<=0||a.5Y<=0){1f 2V}w=a.5X;h=a.5Y}}b.1z=w;b.1B=h;1f mM(b)}1e mn(a,b){if(b!=N)1f 0;if(!a)1f 0;2R(a,0,0,1F(a)*a.1w);1f 1}1q.j5=1e(a){if(a){if(!a.8E)a.aP=\'\';a.fP=0;a.aP=a.fP=1i}};1e j6(a,b){3k(\'mN: j6\')}1e mO(a,b){3k(\'mN: mO\')}1e mP(a){1y(a);1y(a.5G>0);1f 1}1b bB=1p((1a+1a+1),1m);1b bC=1p((1a+1a+1),1m);1b bD=1p((4k+4k+1),8C);1b bE=1p((112+112+1),8C);1b bF=1p((1a+ga+1),1m);1b bG=0;1e mQ(a){if(!bG){1b i;1g(i=-1a;i<=1a;++i){bB[1a+i]=(i<0)?-i:i;bC[1a+i]=bB[1a+i]>>1}1g(i=-4k;i<=4k;++i){bD[4k+i]=(i<-128)?-128:(i>127)?127:i}1g(i=-112;i<=112;++i){bE[112+i]=(i<-16)?-16:(i>15)?15:i}1g(i=-1a;i<=1a+1a;++i){bF[1a+i]=(i<0)?0:(i>1a)?1a:i}bG=1}};1e 5o(v){1f(!(v&~1v))?v:(v<0)?0:1a};1e DM(x,y,v){6a[6b+x+y*bj]=5o(6b+6a[x+y*bj]+((v)>>3))};1b bH=mR+(1<<16);1b bI=mS;1e 6u(a,b){1f(((a)*(b))>>16)}1e j7(e,f,g,h){1b C=1p(4*4,0),4R,1M;1M=0;1b i;4R=C;1g(i=0;i<4;++i){1b a=e[f+0]+e[f+8];1b b=e[f+0]-e[f+8];1b c=6u(e[f+4],bI)-6u(e[f+12],bH);1b d=6u(e[f+4],bH)+6u(e[f+12],bI);4R[1M+0]=a+d;4R[1M+1]=b+c;4R[1M+2]=b-c;4R[1M+3]=a-d;1M+=4;f++}1M=0;1g(i=0;i<4;++i){1b j=4R[1M+0]+4;1b a=j+4R[1M+8];1b b=j-4R[1M+8];1b c=6u(4R[1M+4],bI)-6u(4R[1M+12],bH);1b d=6u(4R[1M+4],bH)+6u(4R[1M+12],bI);g[h+0+0*bj]=5o(g[h+0+0*bj]+((a+d)>>3));g[h+1+0*bj]=5o(g[h+1+0*bj]+((b+c)>>3));g[h+2+0*bj]=5o(g[h+2+0*bj]+((b-c)>>3));g[h+3+0*bj]=5o(g[h+3+0*bj]+((a-d)>>3));1M++;h+=bj}};1e mT(a,b,c,d,e){j7(a,b,c,d);if(e){j7(a,b+16,c,d+4)}}1e mU(a,b,c,d){bM(a,b+0*16,c,d+0,1);bM(a,b+2*16,c,d+4*bj,1)}1e 9X(a,b,c,d){1b e=a[b+0]+4;1b i,j;1g(j=0;j<4;++j){1g(i=0;i<4;++i){1b f=c[d+i+j*bj];c[d+i+j*bj]=5o(c[d+i+j*bj]+((e)>>3))}}};1e mV(a,b,c,d){if(a[b+0*16])9X(a,b+0*16,c,d+0);if(a[b+1*16])9X(a,b+1*16,c,d+4);if(a[b+2*16])9X(a,b+2*16,c,d+4*bj);if(a[b+3*16])9X(a,b+3*16,c,d+4*bj+4)};1e mW(a,b){1b c=1p(16,1h);1b i=1h;1g(i=0;i<4;++i){1b d=a[0+i]+a[12+i];1b e=a[4+i]+a[8+i];1b f=a[4+i]-a[8+i];1b g=a[0+i]-a[12+i];c[0+i]=d+e;c[8+i]=d-e;c[4+i]=g+f;c[12+i]=g-f}1g(i=0;i<4;++i){1b h=b[b.1w-1];1b j=c[0+i*4]+3;1b d=j+c[3+i*4];1b e=c[1+i*4]+c[2+i*4];1b f=c[1+i*4]-c[2+i*4];1b g=j-c[3+i*4];b[h+0]=(d+e)>>3;b[h+16]=(g+f)>>3;b[h+32]=(d-e)>>3;b[h+48]=(g-f)>>3;b[b.1w-1]+=64}};1e mX(a,b){mW(a,b)};1e DN(x,y){6a[(x)+(y)*bj]}1e 7R(a,b,c){1b d=a;1b e=b-bj;1b f=bF;1b g=+1a-d[e-1];1b y;1g(y=0;y<c;++y){1b h=f;1b i=g+a[b-1];1b x;1g(x=0;x<c;++x){a[b+x]=h[i+d[e+x]]}b+=bj}};1e gb(a,b){7R(a,b,4)}1e mY(a,b){7R(a,b,8)}1e mZ(a,b){7R(a,b,16)}1e n0(a,b){1b j;1g(j=0;j<16;++j){1u(a,b+j*bj,a,b-bj,16)}};1e n1(a,b){1b j;1g(j=16;j>0;--j){2R(a,b+0,a[b-1],16);b+=bj}};1e c2(v,a,b){1b j;1g(j=0;j<16;++j){1g(i=0;i<(16);++i)a[b+j*bj+i]=v}};1e n2(a,b){1b c=16;1b j;1g(j=0;j<16;++j){c+=a[b-1+j*bj]+a[b+j-bj]}c2(c>>5,a,b)};1e n3(a,b){1b c=8;1b j;1g(j=0;j<16;++j){c+=a[b-1+j*bj]}c2(c>>4,a,b)};1e n4(a,b){1b c=8;1b i;1g(i=0;i<16;++i){c+=a[b+i-bj]}c2(c>>4,a,b)};1e n5(a,b){c2(aZ,a,b)};1e 1o(a,b,c){1f(((a)+2*(b)+(c)+2)>>2)};1e 1U(a,b){1f(((a)+(b)+1)>>1)};1e gc(a,b){1b c=a;1b d=b-bj;1b e=1c 1d();e.2c(1o(c[d-1],c[d+0],c[d+1]));e.2c(1o(c[d+0],c[d+1],c[d+2]));e.2c(1o(c[d+1],c[d+2],c[d+3]));e.2c(1o(c[d+2],c[d+3],c[d+4]));1b i;1g(i=0;i<4;++i){1u(a,b+i*bj,e,0,4*1F(e))}};1e gd(a,b){1b A=a[b-1-bj];1b B=a[b-1];1b C=a[b-1+bj];1b D=a[b-1+2*bj];1b E=a[b-1+3*bj];a[b+0+0*bj]=a[b+1+0*bj]=a[b+2+0*bj]=a[b+3+0*bj]=1o(A,B,C);a[b+0+1*bj]=a[b+1+1*bj]=a[b+2+1*bj]=a[b+3+1*bj]=1o(B,C,D);a[b+0+2*bj]=a[b+1+2*bj]=a[b+2+2*bj]=a[b+3+2*bj]=1o(C,D,E);a[b+0+3*bj]=a[b+1+3*bj]=a[b+2+3*bj]=a[b+3+3*bj]=1o(D,E,E)};1e ge(a,b){1b c=4;1b i;1g(i=0;i<4;++i)c+=a[b+i-bj]+a[b-1+i*bj];c>>=3;1g(i=0;i<4;++i){2R(a,b+i*bj,c,4)}};1e gf(a,b){1b I=a[b-1+0*bj];1b J=a[b-1+1*bj];1b K=a[b-1+2*bj];1b L=a[b-1+3*bj];1b X=a[b-1-bj];1b A=a[b+0-bj];1b B=a[b+1-bj];1b C=a[b+2-bj];1b D=a[b+3-bj];a[b+(0)+(3)*bj]=1o(J,K,L);a[b+(0)+(2)*bj]=a[b+(1)+(3)*bj]=1o(I,J,K);a[b+(0)+(1)*bj]=a[b+(1)+(2)*bj]=a[b+(2)+(3)*bj]=1o(X,I,J);a[b+(0)+(0)*bj]=a[b+(1)+(1)*bj]=a[b+(2)+(2)*bj]=a[b+(3)+(3)*bj]=1o(A,X,I);a[b+(1)+(0)*bj]=a[b+(2)+(1)*bj]=a[b+(3)+(2)*bj]=1o(B,A,X);a[b+(2)+(0)*bj]=a[b+(3)+(1)*bj]=1o(C,B,A);a[b+(3)+(0)*bj]=1o(D,C,B)};1e gg(a,b){1b A=a[b+0-bj];1b B=a[b+1-bj];1b C=a[b+2-bj];1b D=a[b+3-bj];1b E=a[b+4-bj];1b F=a[b+5-bj];1b G=a[b+6-bj];1b H=a[b+7-bj];a[b+(0)+(0)*bj]=1o(A,B,C);a[b+(1)+(0)*bj]=a[b+(0)+(1)*bj]=1o(B,C,D);a[b+(2)+(0)*bj]=a[b+(1)+(1)*bj]=a[b+(0)+(2)*bj]=1o(C,D,E);a[b+(3)+(0)*bj]=a[b+(2)+(1)*bj]=a[b+(1)+(2)*bj]=a[b+(0)+(3)*bj]=1o(D,E,F);a[b+(3)+(1)*bj]=a[b+(2)+(2)*bj]=a[b+(1)+(3)*bj]=1o(E,F,G);a[b+(3)+(2)*bj]=a[b+(2)+(3)*bj]=1o(F,G,H);a[b+(3)+(3)*bj]=1o(G,H,H)};1e gh(a,b){1b I=a[b-1+0*bj];1b J=a[b-1+1*bj];1b K=a[b-1+2*bj];1b X=a[b-1-bj];1b A=a[b+0-bj];1b B=a[b+1-bj];1b C=a[b+2-bj];1b D=a[b+3-bj];a[b+(0)+(0)*bj]=a[b+(1)+(2)*bj]=1U(X,A);a[b+(1)+(0)*bj]=a[b+(2)+(2)*bj]=1U(A,B);a[b+(2)+(0)*bj]=a[b+(3)+(2)*bj]=1U(B,C);a[b+(3)+(0)*bj]=1U(C,D);a[b+(0)+(3)*bj]=1o(K,J,I);a[b+(0)+(2)*bj]=1o(J,I,X);a[b+(0)+(1)*bj]=a[b+(1)+(3)*bj]=1o(I,X,A);a[b+(1)+(1)*bj]=a[b+(2)+(3)*bj]=1o(X,A,B);a[b+(2)+(1)*bj]=a[b+(3)+(3)*bj]=1o(A,B,C);a[b+(3)+(1)*bj]=1o(B,C,D)};1e gi(a,b){1b A=a[b+0-bj];1b B=a[b+1-bj];1b C=a[b+2-bj];1b D=a[b+3-bj];1b E=a[b+4-bj];1b F=a[b+5-bj];1b G=a[b+6-bj];1b H=a[b+7-bj];a[b+(0)+(0)*bj]=1U(A,B);a[b+(1)+(0)*bj]=a[b+(0)+(2)*bj]=1U(B,C);a[b+(2)+(0)*bj]=a[b+(1)+(2)*bj]=1U(C,D);a[b+(3)+(0)*bj]=a[b+(2)+(2)*bj]=1U(D,E);a[b+(0)+(1)*bj]=1o(A,B,C);a[b+(1)+(1)*bj]=a[b+(0)+(3)*bj]=1o(B,C,D);a[b+(2)+(1)*bj]=a[b+(1)+(3)*bj]=1o(C,D,E);a[b+(3)+(1)*bj]=a[b+(2)+(3)*bj]=1o(D,E,F);a[b+(3)+(2)*bj]=1o(E,F,G);a[b+(3)+(3)*bj]=1o(F,G,H)};1e gj(a,b){1b I=a[b-1+0*bj];1b J=a[b-1+1*bj];1b K=a[b-1+2*bj];1b L=a[b-1+3*bj];a[b+(0)+(0)*bj]=1U(I,J);a[b+(2)+(0)*bj]=a[b+(0)+(1)*bj]=1U(J,K);a[b+(2)+(1)*bj]=a[b+(0)+(2)*bj]=1U(K,L);a[b+(1)+(0)*bj]=1o(I,J,K);a[b+(3)+(0)*bj]=a[b+(1)+(1)*bj]=1o(J,K,L);a[b+(3)+(1)*bj]=a[b+(1)+(2)*bj]=1o(K,L,L);a[b+(3)+(2)*bj]=a[b+(2)+(2)*bj]=a[b+(0)+(3)*bj]=a[b+(1)+(3)*bj]=a[b+(2)+(3)*bj]=a[b+(3)+(3)*bj]=L};1e gk(a,b){1b I=a[b-1+0*bj];1b J=a[b-1+1*bj];1b K=a[b-1+2*bj];1b L=a[b-1+3*bj];1b X=a[b-1-bj];1b A=a[b+0-bj];1b B=a[b+1-bj];1b C=a[b+2-bj];a[b+(0)+(0)*bj]=a[b+(2)+(1)*bj]=1U(I,X);a[b+(0)+(1)*bj]=a[b+(2)+(2)*bj]=1U(J,I);a[b+(0)+(2)*bj]=a[b+(2)+(3)*bj]=1U(K,J);a[b+(0)+(3)*bj]=1U(L,K);a[b+(3)+(0)*bj]=1o(A,B,C);a[b+(2)+(0)*bj]=1o(X,A,B);a[b+(1)+(0)*bj]=a[b+(3)+(1)*bj]=1o(I,X,A);a[b+(1)+(1)*bj]=a[b+(3)+(2)*bj]=1o(J,I,X);a[b+(1)+(2)*bj]=a[b+(3)+(3)*bj]=1o(K,J,I);a[b+(1)+(3)*bj]=1o(L,K,J)};1e n6(a,b){1b j;1g(j=0;j<8;++j){1u(a,b+j*bj,a,b-bj,8)}};1e n7(a,b){1b j;1g(j=0;j<8;++j){2R(a,b+0,a[b-1],8);b+=bj}};1e c3(v,a,b){1b j,k;1g(j=0;j<8;++j){1g(k=0;k<8;++k)a[b+k+j*bj]=v}};1e n8(a,b){1b c=8;1b i;1g(i=0;i<8;++i){c+=a[b+i-bj]+a[b-1+i*bj]}c3(((c>>4)*8S),a,b)};1e n9(a,b){1b c=4;1b i;1g(i=0;i<8;++i){c+=a[b+i-bj]}c3(((c>>3)*8S),a,b)};1e na(a,b){1b c=4;1b i;1g(i=0;i<8;++i){c+=a[b-1+i*bj]}c3(((c>>3)*8S),a,b)};1e nb(a,b){c3(aZ,a,b)};1b bJ=1c 1d(1e(v,o){ge(v,o)},1e(v,o){gb(v,o)},1e(v,o){gc(v,o)},1e(v,o){gd(v,o)},1e(v,o){gf(v,o)},1e(v,o){gh(v,o)},1e(v,o){gg(v,o)},1e(v,o){gi(v,o)},1e(v,o){gk(v,o)},1e(v,o){gj(v,o)});1b bK=1c 1d(1e(v,o){n2(v,o)},1e(v,o){mZ(v,o)},1e(v,o){n0(v,o)},1e(v,o){n1(v,o)},1e(v,o){n3(v,o)},1e(v,o){n4(v,o)},1e(v,o){n5(v,o)});1b bL=1c 1d(1e(v,o){n8(v,o)},1e(v,o){mY(v,o)},1e(v,o){n6(v,o)},1e(v,o){n7(v,o)},1e(v,o){na(v,o)},1e(v,o){n9(v,o)},1e(v,o){nb(v,o)});1e 7e(p,b,c){1b d=p[b-2*c],p0=p[b-c],q0=p[b+0],q1=p[b+c];1b a=3*(q0-p0)+bD[4k+d-q1];1b e=bE[112+((a+4)>>3)];1b f=bE[112+((a+3)>>3)];p[b-c]=bF[1a+p0+f];p[b+0]=bF[1a+q0-e]};1e gl(p,b,c){1b d=p[b-2*c],p0=p[b-c],q0=p[b+0],q1=p[b+c];1b a=3*(q0-p0);1b e=bE[112+((a+4)>>3)];1b f=bE[112+((a+3)>>3)];1b g=(e+1)>>1;p[b-2*c]=bF[1a+d+g];p[b-c]=bF[1a+p0+f];p[b+0]=bF[1a+q0-e];p[b+c]=bF[1a+q1-g]};1e nc(p,b,c){1b d=p[b-3*c],p1=p[b-2*c],p0=p[b-c];1b e=p[b+0],q1=p[b+c],q2=p[b+2*c];1b a=bD[4k+3*(e-p0)+bD[4k+p1-q1]];1b f=(27*a+63)>>7;1b g=(18*a+63)>>7;1b h=(9*a+63)>>7;p[b-3*c]=bF[1a+d+h];p[b-2*c]=bF[1a+p1+g];p[b-c]=bF[1a+p0+f];p[b+0]=bF[1a+e-f];p[b+c]=bF[1a+q1-g];p[b+2*c]=bF[1a+q2-h]};1e c4(p,a,b,c){1b d=p[a-2*b],p0=p[a-b],q0=p[a+0],q1=p[a+b];1f(bB[1a+d-p0]>c)||(bB[1a+q1-q0]>c)};1e 9Y(p,a,b,c){1b d=p[a-2*b],p0=p[a-b],q0=p[a+0],q1=p[a+b];1f(2*bB[1a+p0-q0]+bC[1a+d-q1])<=c};1e c5(p,a,b,t,c){1b d=p[a-4*b],p2=p[a-3*b],p1=p[a-2*b],p0=p[a-b];1b e=p[a+0],q1=p[a+b],q2=p[a+2*b],q3=p[a+3*b];if((2*bB[1a+p0-e]+bC[1a+p1-q1])>t)1f 0;1f bB[1a+d-p2]<=c&&bB[1a+p2-p1]<=c&&bB[1a+p1-p0]<=c&&bB[1a+q3-q2]<=c&&bB[1a+q2-q1]<=c&&bB[1a+q1-e]<=c};1e c6(p,a,b,c){1b i;1g(i=0;i<16;++i){if(9Y(p,a+i,b,c)){7e(p,a+i,b)}}};1e c7(p,a,b,c){1b i;1g(i=0;i<16;++i){if(9Y(p,a+i*b,1,c)){7e(p,a+i*b,1)}}};1e gm(p,a,b,c){1b k;1g(k=3;k>0;--k){a+=4*b;c6(p,a+0,b,c)}};1e gn(p,a,b,c){1b k;1g(k=3;k>0;--k){a+=4;c7(p,a+0,b,c)}};1e 8T(p,a,b,c,d,e,f,g){1s(d-->0){if(c5(p,a+0,b,e,f)){if(c4(p,a+0,b,g)){7e(p,a+0,b)}1k{nc(p,a+0,b)}}a+=c}};1e 4z(p,a,b,c,d,e,f,g){1s(d-->0){if(c5(p,a+0,b,e,f)){if(c4(p,a+0,b,g)){7e(p,a+0,b)}1k{gl(p,a+0,b)}}a+=c}};1e nd(p,a,b,c,d,e){8T(p,a+0,b,1,16,c,d,e)}1e ne(p,a,b,c,d,e){8T(p,a+0,1,b,16,c,d,e)};1e go(p,a,b,c,d,e){1b k;1g(k=3;k>0;--k){a+=4*b;4z(p,a+0,b,1,16,c,d,e)}};1e gp(p,a,b,c,d,e){1b k;1g(k=3;k>0;--k){a+=4;4z(p,a+0,1,b,16,c,d,e)}};1e nf(u,a,v,b,c,d,e,f){8T(u,a,c,1,8,d,e,f);8T(v,b,c,1,8,d,e,f)};1e ng(u,a,v,b,c,d,e,f){8T(u,a,1,c,8,d,e,f);8T(v,b,1,c,8,d,e,f)};1e gq(u,a,v,b,c,d,e,f){4z(u,a+4*c,c,1,8,d,e,f);4z(v,b+4*c,c,1,8,d,e,f)};1e gr(u,a,v,b,c,d,e,f){4z(u,a+4,1,c,8,d,e,f);4z(v,b+4,1,c,8,d,e,f)};1b bM;1b bN;1b bO;1b bP;1b bQ;1b bR;1b bS;1b bT;1b bU;1b bV;1b bW;1b bX;1b bY;1b bZ;1b ca;1b cb;1e nh(a){bM=mT;bN=mU;bO=9X;bP=mV;bQ=nd;bR=ne;bS=nf;bT=ng;bU=go;bV=gp;bW=gq;bX=gr;bY=c6;bZ=c7;ca=gm;cb=gn};1b cc=(32-1);1b cd=3;1b ce=1;1e ni(a){a.8P=0;if(a.6r){1b b=a.9U;if(!DO(b)){1f 2z(a,8F,"DP nj nk.")}b.DQ=a;b.DR=a.6s.2S;b.DS=j8;a.9V=(a.4y>0)?cd:cd-1}1k{a.9V=ce}1f 1}1b cf=1c 1d(0,2,8);1e nl(a){1b b=a.9V;1b c=a.1S;1b d=4*c*1F(1m);1b e=(16+8+8)*c;1b f=(c+1)*1F(bw);1b g=(a.4y>0)?c*(a.6r?2:1)*1F(bv):0;1b h=bk*1F(a.6t);1b i=c8*1F(a.2M);1b j=(16*b+1t(cf[a.4y])*3/2);1b k=e*j;1b l=a.3T?(a.6q.8M*a.6q.7M):0;1b m=d+e+f+g+h+i+k+l+cc;1b n=1m,DT=0;if(m>a.b9){a.1Y=0;a.b9=0;if(a.1Y==1i){1f 2z(a,\'8F\',"no 3G DU j9 nj.")}a.b9=m}n=a.1Y;a.6X=1P;a.g6=8D(1P,(16*c)*1F(a.g6));a.g7=8D(1P,(8*c)*1F(a.g7));a.g8=8D(1P,(8*c)*1F(a.g8));a.5F=g?iG(bv,g):1i;a.nm=g?0:1i;a.6s.6W=0;a.6s.5F=a.5F;if(a.6r){a.6s.nm+=c}1y((h&cc)==0);a.6t=8D(1P,h*1F(a.6t));a.2M=-DV;a.5n=16*c;a.4i=8*c;{1b o=cf[a.4y];1b p=o*a.5n;1b q=(o/2)*a.4i;a.6Z=1p(k,1P);a.7b=+p;a.7a=a.6Z;a.7c=a.7b+16*b*a.5n+q;a.7O=a.7a;a.7P=a.7c+8*b*a.4i+q}a.j1=l?1p(l,1m):1i;a.3y=iG(bw,f);a.6X=8D(bh,d);1f 1}1e nn(a,b){b.1z=a.6q.8M;b.1B=a.6q.7M;b.4K=0;b.y=a.6Z;b.2v=a.7b;b.u=a.7a;b.2s=a.7c;b.v=a.7O;b.2w=a.7P;b.2d=a.5n;b.2j=a.4i;b.aR=0;b.a=1i;b.3u=1i}1e ja(a,b){if(!ni(a))1f 0;if(!nl(a))1f 0;nn(a,b);mQ();nh();1f 1}1e np(a,b){if(b){1f(a>=40)?2:(a>=15)?1:0}1k{1f(a>=40)?3:(a>=20)?2:(a>=15)?1:0}}1e gs(a,b,c){1b d=a.6s;1b e=a.5n;1b f=d.5F[1+b];1b g=a.6Z;1b h=a.7b+d.6W*16*e+b*16;1b i=f.8N;1b j=f.8O;1b k=2*i+j;if(i==0){1f}if(a.4y==1){if(b>0){bZ(g,h,e,k+4)}if(f.6n){cb(g,h,e,k)}if(c>0){bY(g,h,e,k+4)}if(f.6n){ca(g,h,e,k)}}1k{1b l=a.4i;1b m=a.7a;1b n=a.7c+d.6W*8*l+b*8;1b o=a.7O;1b p=a.7P+d.6W*8*l+b*8;1b q=np(i,a.iY.9Q);if(b>0){bR(g,h,e,k+4,j,q);bT(m,n,o,p,l,k+4,j,q)}if(f.6n){bV(g,h,e,k,j,q);bX(m,n,o,p,l,k,j,q)}if(c>0){bQ(g,h,e,k+4,j,q);bS(m,n,o,p,l,k+4,j,q)}if(f.6n){bU(g,h,e,k,j,q);bW(m,n,o,p,l,k,j,q)}}}1e nq(a){1b b=1h;1b c=a.6s.2o;1y(a.6s.6o);1g(b=a.g4;b<a.b8;++b){gs(a,b,c)}}1e jb(a){if(a.4y>0){1b b=a.5F[1+a.2p];1b c=a.3y[1+a.2p].4x;1b d=a.g9[a.1Z];if(a.3S.g1){d+=a.3S.iV[0];if(a.7Q){d+=a.3S.iW[0]}}d=(d<0)?0:(d>63)?63:d;b.8N=d;if(a.3S.6m>0){if(a.3S.6m>4){d>>=2}1k{d>>=1}if(d>9-a.3S.6m){d=9-a.3S.6m}}b.8O=(d<1)?1:d;b.6n=(!c||a.7Q)+0}{1b y;1b e=a.8P*16*a.5n;1b f=a.8P*8*a.4i;1b g=a.6Z;1b h=a.7b+a.2p*16+e;1b i=a.7a;1b j=a.7c+a.2p*8+f;1b k=a.7O;1b l=a.7P+a.2p*8+f;1g(y=0;y<16;++y){1u(g,h+y*a.5n,a.6t,+bm+y*bj,16)}1g(y=0;y<8;++y){1u(i,j+y*a.4i,a.6t,+bn+y*bj,8);1u(k,l+y*a.4i,a.6t,+bo+y*bj,8)}}}1e jc(a){1f((a)*16)}1e j8(a,b){1b c=1;1b d=a.6s;1b e=cf[a.4y];1b f=e*a.5n;1b g=1t(e/2)*a.4i;1b h=d.6W*16*a.5n;1b i=d.6W*8*a.4i;1b j=a.6Z;1b k=a.7b-f+h;1b l=a.7a;1b m=a.7c-g+i;1b n=a.7O;1b o=a.7P-g+i;1b p=(d.2o==0);1b q=(d.2o>=a.2Z-1)+0;1b r=jc(d.2o);1b s=jc(d.2o+1);if(d.6o){nq(a)}if(b.aQ){if(!p){r-=e;b.y=j;b.2v=k;b.u=l;b.2s=m;b.v=n;b.2w=o}1k{b.y=a.6Z;b.2v=a.7b+h;b.u=a.7a;b.2s=a.7c+i;b.v=a.7O;b.2w=a.7P+i}if(!q){s-=e}if(s>b.8J){s=b.8J}if(a.3T){if(r==0){b.a=j3(a,r,s-r);b.3u=0}1k{b.3u=j3(a,r,s-r)}if(b.a==1i){1f 2z(a,2x,"DW nr DX DY 6K.")}}if(r<b.5g){1b t=b.5g-r;r=b.5g;1y(!(t&1));b.2v+=a.5n*t;b.2s+=a.4i*(t>>1);b.2w+=a.4i*(t>>1);if(b.a){b.3u+=b.1z*t}}if(r<s){b.2v+=b.5f;b.2s+=b.5f>>1;b.2w+=b.5f>>1;if(b.a){b.3u+=b.5f}b.4K=r-b.5g;b.2y=b.aS-b.5f;b.2a=s-r;c=b.aQ(b)}}if(d.6W+1==a.9V){if(!q){1u(a.6Z,a.7b-f,j,k+16*a.5n,f);1u(a.7a,a.7c-g,l,m+8*a.4i,g);1u(a.7O,a.7P-g,n,o+8*a.4i,g)}}1f c}1e jd(a,b){1b c=1;1b d=a.6s;if(!a.6r){d.2o=a.2o;d.6o=a.6o;c=j8(a,b)}1k{1b e=a.9U;c&=je(e);1y(e.5l==OK);if(c){d.2S=b;d.6W=a.8P;d.2o=a.2o;d.6o=a.6o;if(d.6o){1b f=d.5F;d.5F=a.5F;a.5F=f}DZ(e);if(++a.8P==a.9V){a.8P=0}}}1f c}1e jf(a,b){if(b.9z&&!b.9z(b)){2z(a,8G,"ns 9z nk");1f a.5l}if(b.9x){a.4y=0}{1b c=cf[a.4y];if(a.4y==2){a.g4=0;a.g5=0}1k{a.g5=b.5g>>4;a.g4=b.5f>>4}a.9W=(b.8J+15+c)>>4;a.b8=(b.aS+15+c)>>4;if(a.b8>a.1S){a.b8=a.1S}if(a.9W>a.2Z){a.9W=a.2Z}}1f T}1e jg(a,b){1b c=1;if(a.6r){c=je(a.9U)}if(b.8I){b.8I(b)}1f c}1b cg=1c 1d(0+0*bj,4+0*bj,8+0*bj,12+0*bj,0+4*bj,4+4*bj,8+4*bj,12+4*bj,0+8*bj,4+8*bj,8+8*bj,12+8*bj,0+12*bj,4+12*bj,8+12*bj,12+12*bj);1e jh(a,b){if(b==bh){if(a.2p==0){1f(a.2o==0)?mE:mD}1k{1f(a.2o==0)?mC:bh}}1f b}1e gt(a,b,c,d){1g(i=0;i<4;++i)a[b+i]=c[d+i]}1e ji(a){1b b=a.6t;1b c=bm;1b d=a.6t;1b e=bn;1b f=a.6t;1b g=bo;if(a.2p>0){1b j;1g(j=-1;j<16;++j){gt(b,(c+j*bj-4),b,(c+j*bj+12))}1g(j=-1;j<8;++j){gt(d,(e+j*bj-4),d,(e+j*bj+4));gt(f,(g+j*bj-4),f,(g+j*bj+4))}}1k{1b j;1g(j=0;j<16;++j){b[c+j*bj-1]=129}1g(j=0;j<8;++j){d[e+j*bj-1]=129;f[g+j*bj-1]=129}if(a.2o>0){b[c-1-bj]=d[e-1-bj]=f[g-1-bj]=129}}{1b h=a.g6;1b k=+a.2p*16;1b l=a.g7;1b m=+a.2p*8;1b o=a.g8;1b p=+a.2p*8;1b q=a.2M;1b n;if(a.2o>0){1u(b,c-bj,h,k,16);1u(d,e-bj,l,m,8);1u(f,g-bj,o,p,8)}1k if(a.2p==0){1g(i=0;i<(16+4+1);++i)b[c-bj-1+i]=127;1g(i=0;i<(8+1);++i)d[e-bj-1+i]=127;1g(i=0;i<(8+1);++i)f[g-bj-1+i]=127}if(a.7Q){1b r=b;1b s=c-bj+16;if(a.2o>0){if(a.2p>=a.1S-1){r[s+0]=r[s+1]=r[s+2]=r[s+3]=h[k+15]}1k{1u(r,s+0,h,k+16,4)}}1g(ii=0;ii<4;++ii)r[ii+s+bj*4]=r[ii+s+1*bj*4]=r[ii+s+2*bj*4]=r[ii+s+3*bj*4]=r[ii+s+0*4];1g(n=0;n<16;n++){1b t=b;1b u=c+cg[n];bJ[a.c0[n]](t,u);if(a.8Q&(1<<n)){bM(q,+n*16,t,u,0)}1k if(a.7d&(1<<n)){bO(q,+n*16,t,u)}}}1k{1b v=jh(a,a.c0[0]);bK[v](b,c);if(a.7d){1g(n=0;n<16;n++){1b t=b;1b u=c+cg[n];if(a.8Q&(1<<n)){bM(q,+n*16,t,u,0)}1k if(a.7d&(1<<n)){bO(q,+n*16,t,u)}}}}{1b v=jh(a,a.j0);bL[v](d,e);bL[v](f,g);if(a.7d&nt){1b w=a.2M;1b x=16*16;if(a.8Q&nt){bN(w,x,d,e)}1k{bP(w,x,d,e)}}if(a.7d&nu){1b y=a.2M;1b x=20*16;if(a.8Q&nu){bN(y,x,f,g)}1k{bP(y,x,f,g)}}if(a.2o<(a.2Z-1)){1u(h,k,b,c+15*bj,16);1u(l,m,d,e+7*bj,8);1u(o,p,f,g+7*bj,8)}}}}1e 2N(v,M){1f v<0?0:v>M?M:v}1b ci=1c 1d(4,5,6,7,8,9,10,10,11,12,13,14,15,16,17,17,18,19,20,20,21,21,22,22,23,23,24,25,25,26,27,28,29,30,31,32,33,34,35,36,37,37,38,39,40,41,42,43,44,45,46,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,76,77,78,79,80,81,82,83,84,85,86,87,88,89,91,93,95,96,98,100,101,102,104,106,108,110,112,114,116,118,122,124,126,128,130,132,134,136,138,140,143,145,148,4M,3o,4v);1b cj=1c 1d(4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,60,62,64,66,68,70,72,74,76,78,80,82,84,86,88,90,92,94,96,98,100,102,104,106,108,110,112,114,116,119,122,125,128,131,134,137,140,143,146,149,4S,3e,c9,6S,8U,4h,3K,5A,6h,5B,6i,5C,3P,5j,3J,1P,2F,2l,5D,2G,3R,9J,2A,3d,3n,2n,1j,nv,nw,nx,gu,iv,ny);1e nA(a){1b b=a.2h;1b c=6g(b,7);1b d=2L(b)?6j(b,4):0;1b e=2L(b)?6j(b,4):0;1b f=2L(b)?6j(b,4):0;1b g=2L(b)?6j(b,4):0;1b h=2L(b)?6j(b,4):0;1b j=a.2Y;1b i=1h;1g(i=0;i<6T;++i){1b q=1h;if(j.9S){q=j.b6[i];if(!j.b5){q+=c}}1k{if(i>0){a.1T[i]=a.1T[0];4n}1k{q=c}}{1b m=a.1T[i];m.g2[0]=ci[2N(q+d,127)];m.g2[1]=cj[2N(q+0,127)];m.9T[0]=ci[2N(q+e,127)]*2;m.9T[1]=1t(cj[2N(q+f,127)]*3e/100);if(m.9T[1]<8)m.9T[1]=8;m.g3[0]=ci[2N(q+g,117)];m.g3[1]=cj[2N(q+h,127)]}}}1b ck=1c 1d(-bh,1,-9K,2,-9L,3,4,6,-9M,5,-fX,-iS,-b0,7,-fY,8,-fZ,-b1);1b cl=1c 1d(1c 1d(1c 1d(1c 1d(128,128,128,128,128,128,128,128,128,128,128),1c 1d(128,128,128,128,128,128,128,128,128,128,128),1c 1d(128,128,128,128,128,128,128,128,128,128,128)),1c 1d(1c 1d(1r,136,1j,1a,4T,2k,128,128,128,128,128),1c 1d(5C,129,5I,1a,4p,2l,1a,2k,128,128,128),1c 1d(106,126,4p,1H,8V,2F,1a,1a,128,128,128)),1c 1d(1c 1d(1,98,2q,1a,3i,4U,1a,1a,128,128,128),1c 1d(5B,133,7S,1j,2G,2A,1a,3o,128,128,128),1c 1d(78,134,6v,2D,4A,6w,1a,2k,128,128,128)),1c 1d(1c 1d(1,6i,2n,1a,2E,1a,128,128,128,128,128),1c 1d(5J,8W,2D,1a,3i,3U,128,128,128,128,128),1c 1d(77,110,7f,1a,3i,5K,128,128,128,128,128)),1c 1d(1c 1d(1,101,1A,1a,3g,1a,128,128,128,128,128),1c 1d(3K,139,3g,1H,3i,2F,1a,1a,128,128,128),1c 1d(37,116,3L,2E,4T,1a,1a,1a,128,128,128)),1c 1d(1c 1d(1,gv,1j,1a,3n,1a,128,128,128,128,128),1c 1d(4L,3M,2r,1a,7S,128,128,128,128,128,128),1c 1d(102,103,4u,1a,3f,1G,128,128,128,128,128)),1c 1d(1c 1d(1,4S,1H,1a,3V,1a,128,128,128,128,128),1c 1d(6h,135,2E,1a,2A,3R,128,128,128,128,128),1c 1d(80,129,3f,1a,9Z,3U,128,128,128,128,128)),1c 1d(1c 1d(1,1,1a,128,128,128,128,128,128,128,128),1c 1d(3W,1,1a,128,128,128,128,128,128,128,128),1c 1d(1a,128,128,128,128,128,128,128,128,128,128))),1c 1d(1c 1d(1c 1d(4A,35,aY,2m,3P,4N,7T,3M,145,3e,62),1c 1d(131,45,4A,2G,a0,4B,6x,4v,1H,2G,1),1c 1d(68,47,146,8X,149,4h,2G,7T,1a,2m,128)),1c 1d(1c 1d(1,149,3g,1a,2G,3U,1a,1a,128,128,128),1c 1d(5J,141,2A,1r,7U,6x,1a,4t,128,128,128),1c 1d(81,99,5B,5I,4B,6y,2n,6v,1a,1a,128)),1c 1d(1c 1d(1,129,5L,1r,8V,5j,5I,3L,1a,1a,128),1c 1d(99,121,gw,2r,3J,4A,1a,6v,128,128,128),1c 1d(23,91,3s,5I,3K,4N,2D,gw,1a,1a,128)),1c 1d(1c 1d(1,gx,3W,1a,2A,1a,128,128,128,128,128),1c 1d(109,7V,3g,1a,4u,3n,1a,1a,128,128,128),1c 1d(44,130,3J,1r,1P,3a,1a,1a,128,128,128)),1c 1d(1c 1d(1,132,3d,1A,2k,2F,1a,4P,128,128,128),1c 1d(94,136,3R,1A,4V,6y,1a,1a,128,128,128),1c 1d(22,100,7W,3n,5p,6S,1a,4t,128,128,128)),1c 1d(1c 1d(1,5q,2n,1a,5L,4O,128,128,128,128,128),1c 1d(124,143,3g,1a,4p,2A,128,128,128,128,128),1c 1d(35,77,5B,1A,3P,3f,1a,1P,128,128,128)),1c 1d(1c 1d(1,4v,2D,1a,3i,4u,1a,1a,128,128,128),1c 1d(121,141,4O,1a,3R,4p,1a,1a,128,128,128),1c 1d(45,99,5M,1A,3E,5D,1a,3U,128,128,128)),1c 1d(1c 1d(1,1,1A,1a,2l,1a,128,128,128,128,128),1c 1d(5i,1,2q,1a,1a,128,128,128,128,128,128),1c 1d(137,1,6h,1a,3U,1a,128,128,128,128,128))),1c 1d(1c 1d(1c 1d(1r,9,2q,1A,4L,8X,1a,3a,128,128,128),1c 1d(2X,13,3U,2E,3P,6i,2n,4A,1a,1a,128),1c 1d(73,17,1G,2G,6S,3Q,3i,4h,1a,2A,128)),1c 1d(1c 1d(1,95,2D,1r,8Y,1O,1a,1a,128,128,128),1c 1d(3d,90,7g,2r,3f,2F,1a,1a,128,128,128),1c 1d(3e,77,3E,2q,5M,3E,1a,1a,128,128,128)),1c 1d(1c 1d(1,24,3d,1A,4V,2k,1a,1P,128,128,128),1c 1d(3J,51,2k,1a,3L,5p,128,128,128,128,128),1c 1d(69,46,6y,3d,3J,4V,1a,4T,128,128,128)),1c 1d(1c 1d(1,2W,1A,1a,1a,128,128,128,128,128,128),1c 1d(2m,4P,2n,1a,2l,1a,128,128,128,128,128),1c 1d(141,124,2q,1a,1a,128,128,128,128,128,128)),1c 1d(1c 1d(1,16,2q,1a,1a,128,128,128,128,128,128),1c 1d(6y,36,5K,1a,3i,1a,128,128,128,128,128),1c 1d(149,1,1a,128,128,128,128,128,128,128,128)),1c 1d(1c 1d(1,4U,1a,128,128,128,128,128,128,128,128),1c 1d(2D,3a,1a,128,128,128,128,128,128,128,128),1c 1d(3V,128,1a,128,128,128,128,128,128,128,128)),1c 1d(1c 1d(1,134,1H,1a,1a,128,128,128,128,128,128),1c 1d(2l,62,2r,1a,1a,128,128,128,128,128,128),1c 1d(55,93,1a,128,128,128,128,128,128,128,128)),1c 1d(1c 1d(128,128,128,128,128,128,128,128,128,128,128),1c 1d(128,128,128,128,128,128,128,128,128,128,128),1c 1d(128,128,128,128,128,128,128,128,128,128,128))),1c 1d(1c 1d(1c 1d(6v,24,2l,4O,5p,2W,6x,3M,3V,2X,1a),1c 1d(126,38,5q,5L,9I,5J,4T,7W,1a,4N,128),1c 1d(61,46,138,2k,4M,7V,3V,3K,1a,7f,128)),1c 1d(1c 1d(1,112,5K,2r,4t,2W,2D,3I,1a,1a,128),1c 1d(3X,109,4T,1H,3f,5h,1a,7W,128,128,128),1c 1d(39,77,7T,5L,a0,6w,3n,7V,1a,1a,128)),1c 1d(1c 1d(1,52,6x,3W,4A,4t,2n,6x,1a,1a,128),1c 1d(124,74,2W,2E,1O,3P,2r,2G,1a,1a,128),1c 1d(24,71,130,2k,3o,3K,2E,5q,1a,1a,128)),1c 1d(1c 1d(1,5q,3R,2n,2k,3V,1a,3U,128,128,128),1c 1d(149,8W,4U,1H,7f,1P,1a,1G,128,128,128),1c 1d(28,108,3K,5I,1O,9Z,1j,2m,1a,1a,128)),1c 1d(1c 1d(1,81,5K,1H,gv,5i,1a,3a,128,128,128),1c 1d(123,102,2F,2D,5M,3L,1a,fW,128,128,128),1c 1d(20,95,9H,2E,8U,5A,1a,5i,128,128,128)),1c 1d(1c 1d(1,7U,2q,1a,7f,2l,128,128,128,128,128),1c 1d(d0,2X,3W,1H,4O,1P,1a,1a,128,128,128),1c 1d(47,116,5h,1a,3f,8Y,1a,1a,128,128,128)),1c 1d(1c 1d(1,121,3i,1r,8Y,8V,1a,1a,128,128,128),1c 1d(141,84,2l,1H,3J,6v,1a,2k,128,128,128),1c 1d(42,80,3M,3V,7T,6i,1a,1P,128,128,128)),1c 1d(1c 1d(1,1,1a,128,128,128,128,128,128,128,128),1c 1d(7g,1,1a,128,128,128,128,128,128,128,128),1c 1d(7S,1,1a,128,128,128,128,128,128,128,128))));1b cm=1c 1d(1c 1d(1c 1d(4u,120,48,89,115,113,120,4S,112),1c 1d(4S,3Q,64,126,3K,118,46,70,95),1c 1d(2X,69,143,80,85,82,72,3e,103),1c 1d(56,58,10,1G,4V,5C,17,13,4S),1c 1d(114,26,17,3s,44,3E,21,10,5A),1c 1d(121,24,80,3E,26,62,44,64,85),1c 1d(144,71,10,38,1G,2l,144,34,26),1c 1d(3K,46,55,19,136,3M,33,gy,71),1c 1d(63,20,8,114,114,8X,12,9,4U),1c 1d(81,40,11,96,5q,84,29,16,36)),1c 1d(1c 1d(134,1O,89,137,98,101,106,4P,148),1c 1d(72,4N,100,130,4v,111,32,75,80),1c 1d(66,102,4h,99,74,62,40,2A,128),1c 1d(41,53,9,7V,3g,141,26,8,107),1c 1d(74,43,26,146,73,3X,49,23,4v),1c 1d(65,38,105,3M,51,52,31,115,128),1c 1d(104,79,12,27,5D,1a,87,17,7),1c 1d(87,68,71,44,114,51,15,5p,23),1c 1d(47,41,14,110,5q,1O,21,17,9Z),1c 1d(66,45,25,102,5j,5C,23,18,22)),1c 1d(1c 1d(88,88,147,8W,42,46,45,3L,1P),1c 1d(43,97,1O,117,85,38,35,3Q,61),1c 1d(39,53,gx,87,26,21,43,5L,1G),1c 1d(56,34,51,104,114,102,29,93,77),1c 1d(39,28,85,1G,58,4P,90,98,64),1c 1d(34,22,116,gy,23,34,43,3X,73),1c 1d(107,54,32,26,51,1,81,43,31),1c 1d(68,25,106,22,64,1G,36,3R,114),1c 1d(34,19,21,102,132,5M,16,76,124),1c 1d(62,18,78,95,85,57,50,48,51)),1c 1d(1c 1d(3P,101,35,3I,5h,111,89,46,111),1c 1d(60,148,31,a0,2k,4T,21,18,111),1c 1d(112,113,77,85,3Q,1a,38,120,114),1c 1d(40,42,1,3L,3n,2F,10,25,109),1c 1d(88,43,29,140,3X,2l,37,43,3o),1c 1d(61,63,30,3e,67,45,68,1,2F),1c 1d(100,80,8,43,3o,1,51,26,71),1c 1d(142,78,78,16,1a,128,34,5j,1G),1c 1d(41,40,5,102,3f,1O,4,1,2G),1c 1d(51,50,17,d0,2F,3a,23,25,82)),1c 1d(1c 1d(138,31,36,1G,27,3X,38,44,9J),1c 1d(67,87,58,9I,82,115,26,59,3Q),1c 1d(63,59,90,6w,59,3X,93,73,3o),1c 1d(40,40,21,116,143,2F,34,39,2X),1c 1d(47,15,16,1O,34,2m,49,45,1O),1c 1d(46,17,33,1O,6,98,15,32,1O),1c 1d(57,46,22,24,128,1,54,17,37),1c 1d(65,32,73,115,28,128,23,128,1P),1c 1d(40,3,9,115,51,3a,18,6,2m),1c 1d(87,37,9,115,59,77,64,21,47)),1c 1d(1c 1d(104,55,44,4V,9,54,53,130,4U),1c 1d(64,90,70,1P,40,41,23,26,57),1c 1d(54,57,112,5J,5,41,38,3X,2l),1c 1d(30,34,26,133,4S,116,10,32,134),1c 1d(39,19,53,2G,26,114,32,73,1a),1c 1d(31,9,65,2A,2,15,1,118,73),1c 1d(75,32,12,51,3a,1a,3M,43,51),1c 1d(88,31,35,67,102,85,55,5p,85),1c 1d(56,21,23,111,59,1P,45,37,3a),1c 1d(55,38,70,124,73,102,1,34,98)),1c 1d(1c 1d(125,98,42,88,104,85,117,2X,82),1c 1d(95,84,53,89,128,100,113,101,45),1c 1d(75,79,123,47,51,128,81,1G,1),1c 1d(57,17,5,71,102,57,53,41,49),1c 1d(38,33,13,121,57,73,26,1,85),1c 1d(41,10,67,138,77,110,90,47,114),1c 1d(115,21,2,10,102,1a,3X,23,6),1c 1d(101,29,16,10,85,128,101,3L,26),1c 1d(57,18,10,102,102,2l,34,20,43),1c 1d(117,20,15,36,3s,128,68,1,26)),1c 1d(1c 1d(102,61,71,37,34,53,31,2E,3a),1c 1d(69,60,71,38,73,119,28,7U,37),1c 1d(68,45,128,34,1,47,11,3n,1G),1c 1d(62,17,19,70,146,85,55,62,70),1c 1d(37,43,37,3o,100,3s,85,3M,1),1c 1d(63,9,92,136,28,64,32,3J,85),1c 1d(75,15,9,9,64,1a,5J,119,16),1c 1d(86,6,28,5,64,1a,25,2q,1),1c 1d(56,8,17,132,137,1a,55,116,128),1c 1d(58,15,20,82,135,57,26,121,40)),1c 1d(1c 1d(8U,50,31,137,3o,133,25,35,4V),1c 1d(51,103,44,131,131,123,31,6,c9),1c 1d(86,40,64,135,148,3U,45,1O,128),1c 1d(22,26,17,131,3V,3o,14,1,2F),1c 1d(45,16,21,91,64,7U,7,1,5j),1c 1d(56,21,39,3e,60,138,23,102,2l),1c 1d(83,12,13,54,3a,1a,68,47,28),1c 1d(85,26,85,85,128,128,32,146,1G),1c 1d(18,11,7,63,144,1G,4,4,3W),1c 1d(35,27,10,146,7W,1G,12,26,128)),1c 1d(1c 1d(6y,80,35,99,6w,80,126,54,45),1c 1d(85,126,47,87,4B,51,41,20,32),1c 1d(101,75,128,139,118,146,116,128,85),1c 1d(56,41,15,4B,3i,85,37,9,62),1c 1d(71,30,17,119,118,1a,17,18,138),1c 1d(101,38,60,138,55,70,43,26,142),1c 1d(146,36,19,30,1G,1a,97,27,20),1c 1d(138,45,61,62,2k,1,81,5M,64),1c 1d(32,41,20,117,4M,142,20,21,3s),1c 1d(112,19,12,61,3E,128,48,4,24)));1e nB(a){1g(i=0;i<a.4w.1w;++i)a.4w[i]=1a;a.2M=1n(cl)}1e nC(a,b){1b c=b.6X;c[c.1w-1]=0+4*b.2p;1b d=b.6Y;b.7Q=!2b(a,145);if(!b.7Q){1b e=2b(a,jj)?(2b(a,128)?9P:9O):(2b(a,3s)?9N:b3);b.c0[0]=e;1g(i=0;i<4;++i)c[i+c[c.1w-1]]=e;1g(i=0;i<4;++i)d[i]=e}1k{1b f=b.c0;1b g=0;1b y;1g(y=0;y<4;++y){1b e=d[y];1b x;1g(x=0;x<4;++x){1b h=cm[c[c[c.1w-1]+x]][e];1b i=0;do{i=ck[2*i+2b(a,h[i])]}1s(i>0);e=-i;c[c[c.1w-1]+x]=e;f[g]=e;g++}d[y]=e}}b.j0=!2b(a,142)?b3:!2b(a,114)?9N:2b(a,1O)?9P:9O}1b cn=1c 1d(1c 1d(1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(4B,3W,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2m,3g,1H,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2n,1r,1r,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,7g,1H,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2A,1j,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1r,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,3W,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(3d,1r,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1a,1j,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,2q,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1A,1a,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1r,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1A,1j,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1a,1j,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1j,1r,1a,1j,1a,1a,1a,1a,1a,1a),1c 1d(2r,1a,1j,1a,1j,1a,1a,1a,1a,1a,1a),1c 1d(1j,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a))),1c 1d(1c 1d(1c 1d(5D,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(3R,1H,3g,1r,1a,1a,1j,1a,1a,1a,1a),1c 1d(2A,2r,3g,2r,1r,1a,1r,1j,1a,1a,1a)),1c 1d(1c 1d(1a,1j,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2m,1j,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(7S,1r,1j,1j,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,2q,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2n,1j,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1r,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2D,1j,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1r,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1H,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1j,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1r,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1j,1r,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2r,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a))),1c 1d(1c 1d(1c 1d(5p,1A,2r,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2A,1A,7g,1j,1a,1a,1a,1a,1a,1a,1a),1c 1d(1A,1A,2E,1r,1j,1a,1j,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1r,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(3i,1r,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1A,1r,1r,1j,1j,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1j,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1j,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1j,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1j,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a))),1c 1d(1c 1d(1c 1d(2q,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2r,1j,1H,1j,1a,1a,1a,1a,1a,1a,1a),1c 1d(2q,1j,2n,1r,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1r,1r,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(3W,1r,1r,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1H,1j,1A,1j,1j,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1j,1H,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2q,1j,1r,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1r,1a,1j,1j,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1A,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(3n,1A,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1r,1r,1j,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1A,1r,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1H,1r,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1j,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1H,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2n,1a,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1j,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1r,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2r,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a))));1e nD(a,d){1b e=d.1X;1b t,b,c,p;1g(t=0;t<6k;++t){1g(b=0;b<6l;++b){1g(c=0;c<5E;++c){1g(p=0;p<6U;++p){if(2b(a,cn[t][b][c][p])){e.2M[t][b][c][p]=6g(a,8)}}}}}d.5m=2L(a);if(d.5m){d.iZ=6g(a,8)}}1b co=12;1b cp=20;1q.E0=1e(a){1f(be<<16)|(bf<<8)|bg};1e jk(a){a.5l=\'fS\';a.iX="OK"}1b cq;1e mv(a,b){if(b!=N){3k(\'E1 4d\');1f 0}if(a){}1f 1}1b cr;1e jl(a){1b b=1n(bz);if(b){jk(b);b.6p=0}1f b}1e jm(a){if(a){jn(a);a=0}}1e 2z(a,b,c){a.5l=b;a.iX=c;a.6p=0;3k(b+\': \'+c);1f 0}1e 8Z(a,b){1f a[b+0]|(a[b+1]<<8)|(a[b+2]<<16)|(a[b+3]<<24)}1e gz(a,b,c,d,e,f){if(!a||!c||!d||!e){1f 0}if(c.1l>=8){if(!aK(a,b.1l,"E2 ",4)){d.1l=1;e.1l=8Z(a,b.1l+4);if((f.1l>=co)&&(e.1l>f.1l-co)){1f 0}b.1l+=8;c.1l-=8}1k{d.1l=0;e.1l=0}}1k{d.1l=-1;e.1l=0}1f 1}1e jo(a,b,c,d,e,f,g){if(c.1l<10){1f 0}if(a[b.1l+3]!=nE||a[b.1l+4]!=8S||a[b.1l+5]!=nF){1f 0}1k{1b i=a[b.1l+0]|(a[b.1l+1]<<8)|(a[b.1l+2]<<16);1b j=!(i&1)+0;1b w=((a[b.1l+7]<<8)|a[b.1l+6])&az;1b h=((a[b.1l+9]<<8)|a[b.1l+8])&az;if(g){if(c.1l<11)1f 0;g.1l=!!(a[b.1l+10]&aZ)}if(!j){1f 0}if(((i>>1)&7)>3){1f 0}if(!((i>>4)&1)){1f 0}if(((i>>5))>=d){1f 0}if(e){e.1l=w}if(f){f.1l=h}1f 1}}1e gA(a,b,c,d,e,f,g){if(!a||!c||!d){1f 0}if(c.1l>=cp){if(!aK(a,b.1l,"nG",4)){1b h=8Z(a,b.1l+4);d.1l=1;if(h.1l!=(cp-8)){1f 0}if(g){g.1l=8Z(a,b.1l+8)}if(e){e.1l=8Z(a,b.1l+12)}if(f){f.1l=8Z(a,b.1l+16)}b.1l+=cp;c.1l-=cp}1k{d.1l=0}}1k{d.1l=-1}1f 1}1e gB(a){1y(a);a.9S=0;a.4Q=0;a.b5=1;1g(i=0;i<a.b6.1w;++i)a.b6[i]=0;1g(i=0;i<a.b7.1w;++i)a.b7[i]=0}1e nH(a,b,c){1y(a);1y(b);b.9S=2L(a);if(b.9S){b.4Q=2L(a);if(2L(a)){1b s;b.b5=2L(a);1g(s=0;s<6T;++s){b.b6[s]=2L(a)?6j(a,7):0}1g(s=0;s<6T;++s){b.b7[s]=2L(a)?6j(a,6):0}}if(b.4Q){1b s;1g(s=0;s<bi;++s){c.4w[s]=2L(a)?6g(a,8):1a}}}1k{b.4Q=0}1f!a.5z}1e nI(a,b,c,d){1b e=a.2h;1b f=b;1b g=c;1b h=b,d1=c+d;1b i;1b j=0;1b k=1h;1b p=1h;a.3h=1<<6g(e,2);k=a.3h-1;i=b;1b j=c+k*3;if(d1<j){1f\'6P\'}1g(p=0;p<k;++p){1b l=f[g+0]|(f[g+1]<<8)|(f[g+2]<<16);1b m=i;1b n=j+l;if(n>d1)m=h;fV(a.2i[+p],i,j,n);i=m;j=n;g+=3}fV(a.2i[+k],i,j,d1);1f(j<d1)?\'fS\':\'4g\'}1e nJ(a,b){1b c=b.3S;c.7N=2L(a);c.6V=6g(a,6);c.6m=6g(a,3);c.g1=2L(a);if(c.g1){if(2L(a)){1b i;1g(i=0;i<g0;++i){if(2L(a)){c.iV[i]=6j(a,6)}}1g(i=0;i<mF;++i){if(2L(a)){c.iW[i]=6j(a,6)}}}}b.4y=(c.6V==0)?0:c.7N?1:2;if(b.4y>0){if(b.2Y.9S){1b s;1g(s=0;s<6T;++s){1b d=b.2Y.b7[s];if(!b.2Y.b5){d+=c.6V}b.g9[s]=d}}1k{b.g9[0]=c.6V}}1f!a.5z}1b cs,E3,E4;1b ct;1e d2(a,b){1b c={1l:0};1b d=1m;1b e={1l:2C};1b f={1l:2C};1b g={1l:2C};1b h={1l:0};1b i={1l:0};1b j=1n(bp);1b k=1n(bq);1b l=1n(bb);1b m=\'fR\';if(a==1i){3k(\'(E5 == 1i)\');1f 0}jk(a);if(b==1i){1f 2z(a,\'2V\',"1i nK E6 to d2()")}d=b.6K;c.1l=b.5Z;e.1l=b.7H;if(d==1i||e.1l<=4){1f 2z(a,\'6P\',"iy m9 6K to 9u j9 a1")}if(!gC(d,c,e,f)){1f 2z(a,2x,"7X: nL 7X nM")}if(!gA(d,c,e,h,1i,1i,1i)){1f 2z(a,2x,"7X: nL nG nM")}if(!gz(d,c,e,i,g,f)){1f 2z(a,2x,"7X: jp 3F jq.")}if(i.1l==-1){1f 2z(a,\'2x\',"7X: jp 3F jq.")}if(e.1l<4){1f 2z(a,6P,"7X: E7 a1.")}c=c.1l;e=e.1l;{1b n=d[c+0]|(d[c+1]<<8)|(d[c+2]<<16);j=a.iY;j.9Q=!(n&1)+0;j.9R=(n>>1)&7;j.iT=(n>>4)&1;j.7L=(n>>5);if(j.9R>3)1f 2z(a,\'2x\',"E8 E9 Ea.");if(!j.iT)1f 2z(a,\'fQ\',"ns nr Eb.");c+=3;e-=3}k=a.6q;if(j.9Q){if(e<7){1f 2z(a,\'6P\',"d3 9u Ec a1")}if(fL(d[c+0])!=nE||fL(d[c+1])!=8S||fL(d[c+2])!=nF){1f 2z(a,\'2x\',"Ed Ee Ef")}k.8M=((d[c+4]<<8)|d[c+3])&az;k.mG=d[c+4]>>6;k.7M=((d[c+6]<<8)|d[c+5])&az;k.mH=d[c+6]>>6;c+=7;e-=7;a.1S=(k.8M+15)>>4;a.2Z=(k.7M+15)>>4;b.1z=k.8M;b.1B=k.7M;b.6Q=0;b.8H=0;b.5g=0;b.5f=0;b.aS=b.1z;b.8J=b.1B;b.2y=b.1z;b.2a=b.1B;nB(a.1X);gB(a.2Y);a.1Z=0}if(j.7L>e){1f 2z(a,\'6P\',"Eg nN 1w")}a.3T=1i;a.4j=0;1b l=a.2h;fV(l,d,c,c+j.7L);c+=j.7L;e-=j.7L;if(j.9Q){k.iU=2L(l);k.mI=2L(l)}if(!nH(l,a.2Y,a.1X)){1f 2z(a,\'2x\',"d3 9u d4 a1")}if(!nJ(l,a)){1f 2z(a,\'2x\',"d3 9u nO a1")}m=nI(a,d,c,e);if(m!=\'fS\'){1f 2z(a,\'2x\',"d3 9u 6z")}nA(a);if(!j.9Q){1f 2z(a,fQ,"iy a Eh j9.")}1k{a.mJ=jr|gD}2L(l);nD(l,a);if(a.6q.iU){1b o=8;1b p=8S;1b q=d;6A=c-o;1b r=3c;if(j.7L<o||q[6A+o-1]!=p){}r=(q[6A+4]<<0)|(q[6A+5]<<8)|(q[6A+6]<<16);if(j.7L<r+o){1f 2z(a,2x,"7X: jp Ei jq.")}a.3T=(r>0)?q:1i;a.c1=(r>0)?6A-r:1i;a.4j=r;r=(q[6A+0]<<0)|(q[6A+1]<<8)|(q[6A+2]<<16);a.5G=r;a.8R=1i;a.mK=q[6A+3]}a.6p=1;1f 1}1b cu=1c 1d(0,1,2,3,6,4,5,6,6,6,6,6,6,6,6,7,0);1b cv=1c 1d(5A,148,140,0);1b cw=1c 1d(4B,3e,140,135,0);1b cx=1c 1d(6w,4v,141,134,130,0);1b cy=1c 1d(1j,1j,2E,5K,3L,6h,9H,140,133,130,129,0);1b cz=1c 1d(cv,cw,cx,cy);1b cA=1c 1d(0,1,4,8,5,2,3,6,9,12,13,10,7,11,14,15);1b cB=3m(1c 1d(5E,6U),\'\');1e gE(a,b,c,d,n,e){1b p=b[cu[n]][c];if(!2b(a,p[0])){1f 0}1s(1){++n;if(!2b(a,p[1])){p=b[cu[n]][0]}1k{1b v,j;if(!2b(a,p[2])){p=b[cu[n]][1];v=1}1k{if(!2b(a,p[3])){if(!2b(a,p[4])){v=2}1k{v=3+2b(a,p[5])}}1k{if(!2b(a,p[6])){if(!2b(a,p[7])){v=5+2b(a,3I)}1k{v=7+2*2b(a,4P);v+=2b(a,145)}}1k{1b f=1m;1b g=2b(a,p[8]);1b h=2b(a,p[9+g]);1b k=2*g+h;v=0;f=cz[k];1b l;1g(i=0;i<(f.1w-1);++i){v+=v+2b(a,f[i])}v+=3+(8<<k)}}p=b[cu[n]][2]}j=cA[n-1];e[e[e.1w-1]+j]=mB(a,v)*d[((j>0)+0)];if(n==16||!2b(a,p[0])){1f n}}if(n==16){1f 16}}}1b cC={i8:1p(4,1m),Ej:2C};1b cD=1c 1d(1c 1d(0,0,0,0),1c 1d(1,0,0,0),1c 1d(0,1,0,0),1c 1d(1,1,0,0),1c 1d(0,0,1,0),1c 1d(1,0,1,0),1c 1d(0,1,1,0),1c 1d(1,1,1,0),1c 1d(0,0,0,1),1c 1d(1,0,0,1),1c 1d(0,1,0,1),1c 1d(1,1,0,1),1c 1d(0,0,1,1),1c 1d(1,0,1,1),1c 1d(0,1,1,1),1c 1d(1,1,1,1));1b cE=Ek;1e 7h(X,S){1f((((X[0]*El+X[1]*Em+X[2]*gD+X[3]*En)*cE)&Eo)>>(S))}1e nP(a,b,c){1b d,gF,6B;1b e=cB;1b q=a.1T[a.1Z];1b f=a.2M;1b g=a.3y[1-1];1b h=1p(4,0),d5=1p(4,0);1b i=1p(4,0),3z=1p(4,0);1b j=0;1b k=0;1b x,y,ch;f=8D(0,c8*1F(f));if(!a.7Q){1b m=1p(16,0);1b n=b.5k+g.5k;b.5k=g.5k=(gE(c,a.1X.2M[1],n,q.9T,0,m)>0)+0;6B=1;e=a.1X.2M[0];mX(m,f);f[f.1w-1]=0}1k{6B=0;e=a.1X.2M[3]}i=aI(cD[b.2g&nQ]);3z=aI(cD[g.2g&nQ]);1g(y=0;y<4;++y){1b l=3z[y];1g(x=0;x<4;++x){1b n=l+i[x];1b o=gE(c,e,n,q.g2,6B,f);i[x]=l=(o>0)+0;d5[x]=((f[f[f.1w-1]+0]!=0)+0);h[x]=(o>1)+0;f[f.1w-1]+=16}3z[y]=l;k|=7h(d5,24-y*4);j|=7h(h,24-y*4)}d=7h(i,24);gF=7h(3z,24);i=aI(cD[b.2g>>4]);3z=aI(cD[g.2g>>4]);1g(ch=0;ch<4;ch+=2){1g(y=0;y<2;++y){1b l=3z[ch+y];1g(x=0;x<2;++x){1b n=l+i[ch+x];1b o=gE(c,a.1X.2M[2],n,q.g3,0,f);i[ch+x]=l=(o>0)+0;d5[y*2+x]=((f[f[f.1w-1]+0]!=0)+0);h[y*2+x]=(o>1)+0;f[f.1w-1]+=16}3z[ch+y]=l}k|=7h(d5,8-ch*2);j|=7h(h,8-ch*2)}d|=7h(i,20);gF|=7h(3z,20);b.2g=d;g.2g=gF;a.2M=f;a.8Q=j+0;a.7d=j|k;b.4x=(!a.7d)+0}1b cF;1e js(a,b){1b c=a.2h;1b d=a.3y[1-1];1b e=a.3y[1+a.2p];if(a.2Y.4Q){a.1Z=!2b(c,a.1X.4w[0])?0+2b(c,a.1X.4w[1]):2+2b(c,a.1X.4w[2])}e.4x=a.5m?2b(c,a.iZ):0;nC(c,a);if(c.5z){1f 0}if(!e.4x){nP(a,e,b)}1k{d.2g=e.2g=0;if(!a.7Q){d.5k=e.5k=0}a.7d=0;a.8Q=0}1f(!b.5z)}1e jt(a){1b b=a.3y[1-1];b.2g=0;b.5k=0;2R(a.6Y,0,bh,a.6Y.1w);a.6o=((a.4y>0)&&(a.2o>=a.g5)&&(a.2o<=a.9W))+0}1b cG;1e nR(a,b){1g(a.2o=0;a.2o<a.9W;++a.2o){cG=a.2i[a.2o&(a.3h-1)];jt(a);1g(a.2p=0;a.2p<a.1S;a.2p++){if(!js(a,cG)){1f 2z(a,\'6P\',"Ep Eq-of-Er Es."+a.2p+\' \'+a.2o)}ji(a);jb(a)}if(!jd(a,b)){1f 2z(a,\'8G\',"Et Eu.")}}if(a.6r&&!je(a.9U)){1f 0}if(a.5G>0){if(!mP(a)){1f 0}}1f 1}1e ju(a,b){1b c=0;if(a==1i){1f 0}if(b==1i){1f 2z(a,\'2V\',"Ev nK Ew in ju().")}if(!a.6p){if(!d2(a,b)){1f 0}}1y(a.6p);c=(jf(a,b)==T);if(c){if(c)c=ja(a,b);if(c)c=nR(a,b);c&=jg(a,b)}if(!c){jn(a);1f 0}a.6p=0;1f 1}1e jn(a){if(a==1i){1f}if(a.6r){Ex(a.9U)}if(a.1Y){a.1Y=0}a.1Y=1i;a.b9=0;a.6p=0}1b cH=16,3p=-4p,gG=1I+4U;1e 9a(y,u,v,a,b){1b c=cJ[v];1b d=(cK[v]+a2[u])>>cH;1b e=a3[u];a[b+0]=cL[y+c-3p];a[b+1]=cL[y+d-3p];a[b+2]=cL[y+e-3p]}1e gH(y,u,v,a,b){1b c=cJ[v];1b d=(cK[v]+a2[u])>>cH;1b e=a3[u];a[b+0]=((cL[y+c-3p]&Ey)|(cL[y+d-3p]>>5));a[b+1]=(((cL[y+d-3p]<<3)&Ez)|(cL[y+e-3p]>>3))}1e jv(y,u,v,a,b){9a(y,u,v,a,b+1)}1e gI(y,u,v,a,b){a[b+0]=1v;jv(y,u,v,a,b)}1e jw(y,u,v,a,b){1b c=cJ[v];1b d=(cK[v]+a2[u])>>cH;1b e=a3[u];a[b+0]=((cM[y+c-3p]<<4)|cM[y+d-3p]);a[b+1]=((a[b+1]<<44)|(cM[y+e-3p]<<4))}1e gJ(y,u,v,a,b){a[b+1]=EA;jw(y,u,v,a,b)}1e a4(y,u,v,a,b){1b c=cJ[v];1b d=(cK[v]+a2[u])>>cH;1b e=a3[u];a[b+0]=cL[y+e-3p];a[b+1]=cL[y+d-3p];a[b+2]=cL[y+c-3p]}1e gK(y,u,v,a,b){a4(y,u,v,a,b);a[b+3]=1v}1e gL(y,u,v,a,b){9a(y,u,v,a,b);a[b+3]=1v}1b cI=(1<<(cH-1));1b cJ=1p(1I,4q),a3=1p(1I,4q);1b cK=1p(1I,6L),a2=1p(1I,6L);1b cL=1p(gG-3p,1m);1b cM=1p(gG-3p,1m);1b cN=0;1e 2N(v,a){1f v<0?0:v>a?a:v}1e nS(a){1b i;if(cN){1f}1g(i=0;i<1I;++i){cJ[i]=(EB*(i-128)+cI)>>cH;a2[i]=-EC*(i-128)+cI;cK[i]=-ED*(i-128);a3[i]=(EE*(i-128)+cI)>>cH}1g(i=3p;i<gG;++i){1b k=((i-16)*EF+cI)>>cH;cL[i-3p]=2N(k,1a);cM[i-3p]=2N((k+8)>>4,15)}cN=1}1e d6(u,v){1f((u)|((v)<<16))}1e 5r(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s){1b x;1b t=(q-1)>>1;1b u=d6(e[f+0],g[h+0]);1b v=d6(i[j+0],k[l+0]);if(a){1b w=(3*u+v+gM)>>2;r(a[b+0],w&1v,(w>>16),m,n)}if(c){1b w=(3*v+u+gM)>>2;r(c[d+0],w&1v,(w>>16),o,p)}1g(x=1;x<=t;++x){1b y=d6(e[f+x],g[h+x]);1b z=d6(i[j+x],k[l+x]);1b A=u+y+v+z+EG;1b B=(A+2*(y+v))>>3;1b C=(A+2*(u+z))>>3;if(a){1b w=(B+u)>>1;1b D=(C+y)>>1;r(a[b+2*x-1],w&1v,(w>>16),m,n+(2*x-1)*s);r(a[b+2*x-0],D&1v,(D>>16),m,n+(2*x-0)*s)}if(c){1b w=(C+v)>>1;1b D=(B+z)>>1;r(c[d+2*x-1],w&1v,(w>>16),o,p+(2*x-1)*s);r(c[d+2*x+0],D&1v,(D>>16),o,p+(2*x+0)*s)}u=y;v=z}if(!(q&1)){if(a){1b w=(3*u+v+gM)>>2;r(a[b+q-1],w&1v,(w>>16),m,n+(q-1)*s)}if(c){1b w=(3*v+u+gM)>>2;r(c[d+q-1],w&1v,(w>>16),o,p+(q-1)*s)}}}1e jx(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l){5r(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l,9a,3)}1e jy(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l){5r(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l,a4,3)}1e nT(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l){5r(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l,gL,4)}1e nU(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l){5r(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l,gK,4)}1e nV(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l){5r(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l,gI,4)}1e nW(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l){5r(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l,gJ,2)}1e jz(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l){5r(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l,gH,2)}1e nX(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l){5r(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l,9a,4)}1e nY(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l){5r(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l,a4,4)}1e nZ(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l){5r(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l,jv,4)}1e o0(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l){5r(A,a,B,b,C,c,D,d,E,e,F,f,G,g,H,h,l,jw,2)}1b cO=1c 1d(fO);1b cP=1c 1d(fO);1e o1(a){cO[O]=jx;cO[6M]=nT;cO[7D]=jy;cO[6N]=nU;cO[7E]=nV;cO[7F]=nW;cO[fN]=jz;cP[O]=jx;cP[6M]=nX;cP[7D]=jy;cP[6N]=nY;cP[7E]=nZ;cP[7F]=o0;cP[fN]=jz}1e 7Y(a,b,c,d,u,e,v,f,g,h,j,k,l,m,n){1b i;1g(i=0;i<l-1;i+=2){m(a[b+0],u[e+0],v[f+0],g,h);m(a[b+1],u[e+0],v[f+0],g,h+n);m(c[d+0],u[e+0],v[f+0],j,k);m(c[d+1],u[e+0],v[f+0],j,k+n);b+=2;d+=2;e++;f++;h+=2*n;k+=2*n}if(i==l-1){m(a[b+0],u[e+0],v[f+0],g,h);m(c[d+0],u[e+0],v[f+0],j,k)}}1e o2(A,a,B,b,C,c,D,d,E,e,F,f,l){7Y(A,a,B,b,C,c,D,d,E,e,F,f,l,9a,3)}1e o3(A,a,B,b,C,c,D,d,E,e,F,f,l){7Y(A,a,B,b,C,c,D,d,E,e,F,f,l,a4,3)}1e o4(A,a,B,b,C,c,D,d,E,e,F,f,l){7Y(A,a,B,b,C,c,D,d,E,e,F,f,l,gL,4)}1e o5(A,a,B,b,C,c,D,d,E,e,F,f,l){7Y(A,a,B,b,C,c,D,d,E,e,F,f,l,gK,4)}1e o6(A,a,B,b,C,c,D,d,E,e,F,f,l){7Y(A,a,B,b,C,c,D,d,E,e,F,f,l,gI,4)}1e o7(A,a,B,b,C,c,D,d,E,e,F,f,l){7Y(A,a,B,b,C,c,D,d,E,e,F,f,l,gJ,2)}1e o8(A,a,B,b,C,c,D,d,E,e,F,f,l){7Y(A,a,B,b,C,c,D,d,E,e,F,f,l,gH,2)}1b cQ=1c 1d(o2,o4,o3,o5,o6,o7,o8);1e 7Z(y,a,u,b,v,c,d,e,f,g,h){1b i;1g(i=0;i<f;++i)g(y[a+i],u[b+i],v[c+i],d[e+i*h],0)}1e o9(A,a,B,b,C,c,D,d,l){7Z(A,a,B,b,C,c,D,d,l,9a,3)}1e oa(A,a,B,b,C,c,D,d,l){7Z(A,a,B,b,C,c,D,d,l,a4,3)}1e ob(A,a,B,b,C,c,D,d,l){7Z(A,a,B,b,C,c,D,d,l,gL,4)}1e oc(A,a,B,b,C,c,D,d,l){7Z(A,a,B,b,C,c,D,d,l,gK,4)}1e od(A,a,B,b,C,c,D,d,l){7Z(A,a,B,b,C,c,D,d,l,gI,4)}1e oe(A,a,B,b,C,c,D,d,l){7Z(A,a,B,b,C,c,D,d,l,gJ,2)}1e og(A,a,B,b,C,c,D,d,l){7Z(A,a,B,b,C,c,D,d,l,gH,2)}1b cR=1c 1d(o9,ob,oa,oc,od,oe,og);1e oh(a,p){1b b=p.1L;1b c=b.u.1J;1b d=c.y;1b e=c.2v+a.4K*c.2d;1b f=c.u;1b g=c.2s+(a.4K>>1)*c.5W;1b h=c.v;1b i=c.2w+(a.4K>>1)*c.6O;1b k=a.2y;1b l=a.2a;1b m=1t((k+1)/2);1b j;1g(j=0;j<l;++j){1u(d,e+j*c.2d,a.y,a.2v+j*a.2d,k)}1g(j=0;j<(l+1)/2;++j){1u(f,g+j*c.5W,a.u,a.2s+j*a.2j,m);1u(h,i+j*c.6O,a.v,a.2w+j*a.2j,m)}1f a.2a}1e oi(a,p){1b b=p.1L;1b c=b.u.3w;1b d=c.5y;1b e=c.7G+a.4K*c.2U;1b f=a.y;1b g=a.2v;1b h=a.u;1b i=a.2s;1b k=a.v;1b l=a.2w;1b m=cQ[b.2e];1b n=a.2y;1b o=a.2a-1;1b j;1g(j=0;j<o;j+=2){m(f,g,f,g+a.2d,h,i,k,l,d,e,d,e+c.2U,n);g+=2*a.2d;i+=a.2j;l+=a.2j;e+=2*c.2U}if(j==o){m(f,g,f,g,h,i,k,l,d,e,d,e,n)}1f a.2a}1e oj(a,p){1b b=a.2a;1b c=p.1L.u.3w;1b d=c.5y;1b e=c.7G+a.4K*c.2U;1b f=a.a?cP[p.1L.2e]:cO[p.1L.2e];1b g=a.y;1b h=a.2v;1b i=a.u;1b j=a.2s;1b k=a.v;1b l=a.2w;1b m=p.9G;1b n=p.aX;1b o=p.aV;1b q=p.fU;1b y=a.4K;1b r=a.4K+a.2a;1b s=a.2y;1b t=1t((s+1)/2);if(y==0){f(1i,1i,g,h,i,j,k,l,i,j,k,l,1i,1i,d,e,s)}1k{f(p.9F,p.aW,g,h,m,n,o,q,i,j,k,l,d,e-c.2U,d,e,s);b++}1g(;y+2<r;y+=2){m=i;n=j;o=k;q=l;j+=a.2j;l+=a.2j;e+=2*c.2U;h+=2*a.2d;f(g,h-a.2d,g,h,m,n,o,q,i,j,k,l,d,e-c.2U,d,e,s)}h+=a.2d;if(a.5g+r<a.8J){1u(p.9F,p.aW,g,h,s*1F(p.9F));1u(p.9G,p.aX,i,j,t*1F(p.9G));1u(p.aV,p.fU,k,l,t*1F(p.aV));b--}1k{if(!(r&1)){f(g,h,1i,1i,i,j,k,l,i,j,k,l,d,e+c.2U,1i,1i,s)}}1f b}1e ok(a,p){1b b=a.2y;1b c=a.2a;1b j;1b d=p.1L.u.1J;1b e=d.a;1b f=d.3u+a.4K*d.3v;1b g=a.a;1b h=a.3u;if(g!=1i){1g(j=0;j<c;++j){1u(e,f,g,h,b*1F(e));h+=a.1z;f+=d.3v}}1f 0}1e ol(a,p){1b b=p.1L.2e;1b c=b==7E?0:(b==7F?1:3);1b d=b==7F?2:4;1b e=a.2y;1b f=a.2a;1b i,j;1b g=p.1L.u.3w;1b h=g.5y;1b k=g.7G+a.4K*g.2U;1b l=a.a;1b m=a.3u;if(l!=1i){1g(j=0;j<f;++j){1g(i=0;i<e;++i){h[k+d*i+c]=l[m+i]}m+=a.1z;k+=g.2U}}1f 0}1b cS=30;1e gN(x,y){1f(((x)*(y)+(1<<(cS-1)))>>cS)}1e 7i(a,b,c,d,e,f,g,h,i,j,k,l,m,n){a.9A=(b<f)+0;a.mw=b;a.mx=c;a.7I=f;a.my=g;a.6a=d;a.6b=e;a.iP=h;a.aT=a.9A?(j-1):i-j;a.aU=a.9A?(i-1):j;a.4s=k;a.iO=k;a.fT=l;a.iM=1t((1<<cS)/j);a.iL=1t((1<<cS)/l);a.iN=a.9A?1t(iD(g,cS))/(j*c):1t(iD(g,cS))/(i*c);a.9B=m;a.9C=0*4;a.9D=m;a.9E=n+f*4}1e jA(a,b,c){1b d=0;1b e=1h;1b f=0;if(!c.9A){1b g=0;1g(e=0;e<c.7I;++e){f+=c.aT;1g(;f>0;f-=c.aU){g+=a[b+(d++)]}{1b h=a[b+(d++)];1b i=h*(-f);aG(c.9D,c.9E+e*4,((g+h)*c.aU-i));g=gN(i,c.iM)}}}1k{1b j=a[b+0],d7=a[b+0];1g(e=0;e<c.7I;++e){if(f<0){j=d7;d7=a[b+(++d)];f+=c.aT}aG(c.9D,c.9E+e*4,(d7*c.aT+(j-d7)*f));f-=c.aU}}1g(e=0;e<c.7I;++e){aG(c.9B,c.9C+e*4,(aH(c.9D,c.9E+e*4)+aH(c.9B,c.9C+e*4)))}}1e a5(a){1b b=1h;1b c=a.iL*(-a.4s);1y(a.4s<=0);1g(b=0;b<a.7I;++b){1b d=gN(aH(a.9D,a.9E+b*4),c);1b v=gN(aH(a.9B,a.9C+b*4)-d,a.iN);a.6a[a.6b+b]=(!(v&~1v))?v:(v<0)?0:1a;aG(a.9B,a.9C+b*4,d)}a.4s+=a.iO;a.6b+=a.iP}1e d8(a,b,c,d,e){1b f=0;1s(d-->0){jA(a,e);b+=c;e.4s-=e.fT;1s(e.4s<=0){a5(e);f++}}1f f}1e om(a,p){1b b=a.2a;1b c=(b+1)>>1;1b d=d8(a.y,a.2v,a.2d,b,p.6c);d8(a.u,a.2s,a.2j,c,p.6d);d8(a.v,a.2w,a.2j,c,p.6R);1f d}1e on(a,p){if(a.a!=1i){d8(a.a,a.3u,a.1z,a.2a,p.6e)}1f 0}1e gO(a){1f(a==6M||a==6N||a==7E||a==7F||a==aL)}1e oo(a,p){1b b=gO(p.1L.2e);1b c=p.1L.u.1J;1b d=a.5X;1b e=a.5Y;1b f=(d+1)>>1;1b g=(e+1)>>1;1b h=(a.2y+1)>>1;1b i=(a.2a+1)>>1;1b j=2*d;1b k=2*f;1b l=3c;1b m=6L;1b n=0;l=j+2*k;if(b){l+=j}p.3G=4f(l*1F(m)*4,0);if(p.3G==1i){1f 0}m=p.3G;n=0;7i(p.6c,a.2y,a.2a,c.y,c.2v,d,e,c.2d,a.2y,d,a.2a,e,m,n);7i(p.6d,h,i,c.u,c.2s,f,g,c.5W,h,f,i,g,m,n+j);7i(p.6R,h,i,c.v,c.2w,f,g,c.6O,h,f,i,g,m,n+j+k);p.7K=om;if(b){7i(p.6e,a.2y,a.2a,c.a,c.3u,d,e,c.3v,a.2y,d,a.2a,e,m,n+j+2*k);p.8L=on}1f 1}1e 6C(a,b,c,d,e){1b f=0;1s(f<d&&e.4s>0){jA(a,b,e);b+=c;++f;e.4s-=e.fT}1f f}1e op(p,a){1b b=cR[p.1L.2e];1b c=p.1L.u.3w;1b d=c.5y;1b e=c.7G+(p.7J+a)*c.2U;1b f=0;1s(p.6c.4s<=0&&p.6d.4s<=0){1y(p.7J+a+f<p.1L.1B);1y(p.6d.4s==p.6R.4s);a5(p.6c);a5(p.6d);a5(p.6R);b(p.6c.6a,p.6c.6b,p.6d.6a,p.6d.6b,p.6R.6a,p.6R.6b,d,e,p.6c.7I);e+=c.2U;f++}1f f}1e oq(a,p){1b b=a.2a;1b c=(b+1)>>1;1b j=0,a6=0;1b d=0;1s(j<b){1b e=6C(a.y,a.2v+j*a.2d,a.2d,b-j,p.6c);1b f=6C(a.u,a.2s+a6*a.2j,a.2j,c-a6,p.6d);1b g=6C(a.v,a.2w+a6*a.2j,a.2j,c-a6,p.6R);1y(f==g);j+=e;a6+=f;d+=op(p,d)}1f d}1e or(p,a){1b b=p.1L.u.3w;1b c=b.5y;1b d=b.7G+(p.7J+a)*b.2U;1b e=0;1s(p.6e.4s<=0){1b i;1y(p.7J+a+e<p.1L.1B);a5(p.6e);1g(i=0;i<p.6e.7I;++i){c[d+4*i+3]=p.6e.6a[p.6e.6b+i]}d+=b.2U;e++}1f e}1e os(a,p){if(a.a!=1i){1b j=0,jB=0;1s(j<a.2a){j+=6C(a.a,a.3u+j*a.1z,a.1z,a.2a-j,p.6e);jB+=or(p,jB)}}1f 0}1e ot(a,p){1b b=gO(p.1L.2e);1b c=a.5X;1b d=a.5Y;1b e=(a.2y+1)>>1;1b f=(a.2a+1)>>1;1b g=2*c;1b h=6L;1b i=0;1b j=1m;1b k=0;1b l=3c,gP=3c;l=3*g;gP=3*c;if(b){l+=g;gP+=c}p.3G=4f(l*1F(h)*4+gP*1F(j)*1,0);p.ou=0;if(p.3G==1i){EH(\'3G 4d\');1f 0}h=p.3G;i=p.ou;j=h;k=i+l*1;7i(p.6c,a.2y,a.2a,j,k+0*c*1,c,d,0,a.2y,c,a.2a,d,h,i+0*g*4);7i(p.6d,e,f,j,k+1*c*1,c,d,0,a.2y,2*c,a.2a,2*d,h,i+1*g*4);7i(p.6R,e,f,j,k+2*c*1,c,d,0,a.2y,2*c,a.2a,2*d,h,i+2*g*4);p.7K=oq;if(b){7i(p.6e,a.2y,a.2a,j,k+3*c*1,c,d,0,a.2y,c,a.2a,d,h,i+3*g*4);p.8L=os}1f 1}1e ov(a,b){1b W=b.1z;1b H=b.1B;1b x=0,y=0,w=W,h=H;b.8H=(a!=1i)&&(a.8H>0);if(b.8H){w=a.iI;h=a.iJ;x=a.5f&~1;y=a.5g&~1;if(x<0||y<0||w<=0||h<=0||x+w>W||y+h>H){1f 0}}b.5f=x;b.5g=y;b.aS=x+w;b.8J=y+h;b.2y=w;b.2a=h;b.6Q=((a!=1i)&&(a.6Q>0))+0;if(b.6Q){if(a.5X<=0||a.5Y<=0){1f 0}b.5X=a.5X;b.5Y=a.5Y}b.9x=a&&a.9x;b.aR=((a==1i)||(!a.ms))+0;if(b.6Q){b.9x=(b.5X<1t(W*3/4))+0&&(b.5Y<1t(H*3/4))+0;b.aR=0}1f 1}1e ow(a){1b p=a.9y;1b b=(p.1L.2e<4r);p.3G=1i;p.7K=1i;p.8L=1i;if(!ov(p.8K,a)){1f 0}if(a.6Q){1b c=b?ot(a,p):oo(a,p);if(!c){3k(\'3G 4d #1\');1f 0}}1k{if(b){p.7K=oi;if(a.aR){1b d=(a.2y+1)>>1;p.3G=4f(a.2y+2*d,1P);if(p.3G==1i){3k(\'3G 4d #2\');1f 0}p.9F=p.3G;p.aW=0;p.9G=p.9F;p.aX=p.aW+a.2y;p.aV=p.9G;p.fU=p.aX+d;p.7K=oj;o1()}}1k{p.7K=oh}if(gO(p.1L.2e)){p.8L=b?ol:ok}}if(b){nS()}1f 1}1e ox(a){1b p=a.9y;1b b=a.2y;1b c=a.2a;1b d;1y(!(a.4K&1));if(b<=0||c<=0){1f 0}d=p.7K(a,p);p.7J+=d;if(p.8L){p.8L(a,p)}1f 1}1e oy(a){1b p=a.9y;p.3G=\'\';p.3G=1i}1e jC(b,c){c.aQ=1e(a){1f ox(a)};c.9z=1e(a){1f ow(a)};c.8I=1e(a){1f oy(a)};c.9y=b}1b co=12;1b cT=10;1b cU=fD;1b cV=fD;1b cW=0,gQ=1,gR=2,jD=3,jE=4;1b cX=0,d9=1,jF=2;1b cY={6D:\'EI\',6E:2C,5s:2C,9b:3c,1R:1m,1K:0,e0:3c,gS:1m,jG:0};1b cZ={4C:"EJ",7j:1n(ba),4D:1n(bz),2S:1n(Y),1Y:1n(cY),2H:1n(R)};1b da={8a:1n(bw),8b:1n(bw),6X:1p(4,1m),6Y:1p(4,1m),2h:1n(bb),8c:1n(bb)};1e 8d(a){1f(a.5s-a.6E)}1e oz(a,b,c){1b d=a.1Y;1b e=a.4D;1b f=e.3h-1;1y(d.6D==d9);if(d.5s+c>d.9b){1b p;1b g=1i;1b h=0;1b i=1t((8d(d)+c+cU-1)/cU);1b j=i*cU;1b k=d.1R;1b l=d.1K+d.6E;1b g=4f(j-1,1P);1b h=0;if(!g)1f 0;1u(g,h,k,l,8d(d));1g(p=0;p<=f;++p){if(e.2i[p].1K!=1i){e.2i[p].1R=g;e.2i[p].1K=h+((e.2i[p].1K)-l);e.2i[p].3H=h+((e.2i[p].3H)-l)}}d.1R=\'\';d.1R=g;d.1K=h;d.9b=j;d.5s=8d(d);d.6E=0}1u(d.1R,d.1K+d.5s,b,0,c);d.5s+=c;1y(d.5s<=d.9b);if(f>=0){e.2i[f].3H=d.1K+d.5s}a.2S.6K=d.1R;a.2S.5Z=d.1K;a.2S.7H=8d(d);1f 1}1e oA(a,b,c,d){1b p;1b e=a.1Y;1b f=a.4D;1b g=f.3h-1;1b h=e.1R;1b i=e.1K;1y(e.6D==jF);if(d<e.9b){3k(\'we d3 EK to a EL EM!\');1f 0}1g(p=0;p<=g;++p){if(f.2i[p].1K!=1i){f.2i[p].1R=b;f.2i[p].1K=c+((f.2i[p].1K)-i);f.2i[p].3H=c+((f.2i[p].3H)-i)}}if(g>=0){f.2i[g].3H=c+d}if(f.2h.1R){f.2h.1R=b;f.2h.1K=c+((f.2h.1K)-i);f.2h.3H=c+((f.2h.3H)-i)}e.1R=b;e.1K=c;e.5s=e.9b=d;a.2S.6K=b;a.2S.5Z=c;a.2S.7H=d;1f 1}1e oB(a){a.6D=cX;a.1R=0;a.9b=0;a.gS=0;a.e0=0}1e oC(a){1y(a);if(a.6D==d9){a.1R=\'\';a.1K=0;a.gS=\'\';a.jG=\'\'}}1e jH(a,b){if(a.6D==cX){a.6D=b}1k if(a.6D!=b){3k(\'we EN mc EO => 4d\');1f 0}1y(a.6D==b);1f 1}1e oD(a,b,c){1b d=a.2h;1b e=a.3y[1-1];1b f=a.3y[1+a.2p];c.8a=1n(e);c.8b=1n(f);c.2h=1n(d);c.8c=1n(b);1u(c.6X,0,a.6X,+4*a.2p,4);1u(c.6Y,0,a.6Y,0,4)}1e oE(a,b,c){1b d=b.2h;1b e=b.3y[1-1];1b f=b.3y[1+b.2p];e.5k=a.8a.5k;e.8O=a.8a.8O;e.6n=a.8a.6n;e.8N=a.8a.8N;e.2g=a.8a.2g;e.4x=a.8a.4x;f.5k=a.8b.5k;f.8O=a.8b.8O;f.6n=a.8b.6n;f.8N=a.8b.8N;f.2g=a.8b.2g;f.4x=a.8b.4x;b.2h.3H=a.2h.3H;b.2h.1K=a.2h.1K;b.2h.5z=a.2h.5z;b.2h.6f=a.2h.6f;b.2h.2f=a.2h.2f;b.2h.3x=a.2h.3x;c.3H=(a.8c.3H);c.1K=(a.8c.1K);c.5z=(a.8c.5z);c.6f=(a.8c.6f);c.2f=(a.8c.2f);c.3x=(a.8c.3x);1u(b.6X,+4*b.2p,a.6X,0,4);1u(b.6Y,0,a.6Y,0,4)}1e 4W(a,b){if(a.4C==gR){1b c=a.2S;if(c.8I){c.8I(c)}}a.4C=jE;1f b}1e oF(a){1b b=2C,aF=2C;1b c=a.1Y.1R;1b d={1l:(a.1Y.1K+a.1Y.6E)};1b e={1l:8d(a.1Y)};1b f={1l:2C};1b g={1l:2C};1b h={1l:0};1b i={1l:0};if(e.1l<co){1f 4g}if(!gC(c,d,e,g)){1f 4W(a,2x)}if(!gA(c,d,e,h,1i,1i,1i)){1f 4W(a,2x)}if(h.1l==-1){1f 4g}if(!gz(c,d,e,i,f,g)){1f 4W(a,2x)}if((i.1l==-1)&&(f.1l==0)){1f 4g}if(e.1l<cT){1f 4g}if(!jo(c,d,e,f,1i,1i,1i)){1f 4W(a,2x)}e=e.1l;d=d.1l;b=a.1Y.5s-e;aF=c[d+0]|(c[d+1]<<8)|(c[d+2]<<16);a.1Y.e0=(aF>>5)+cT;a.1Y.6E+=b;1y(a.1Y.6E<=a.1Y.5s);a.2S.7H-=b;a.2S.6K=c;a.2S.5Z=d;a.4C=gQ;1f T}1e oG(a){1b b=a.4D.2h;1b c=b.3H-b.1K;1b d=a.1Y;1y(c>0);1y(c<=d.e0);if(d.6D==d9){1b e=4f(c,1m);1b f=0;if(!e){1f 0}1u(e,f,b.1R,b.1K,c);d.gS=e;d.jG=f;d.6E+=c;b.1R=e;b.1K=f;b.3H=f+c}1k{}1f 1}1e oH(a){1b b=a.4D;1b c=a.2S;1b d=a.7j;1b e=d.1L;if(8d(a.1Y)<a.1Y.e0){1f 4g}if(!d2(b,c)){1b f=b.5l;if(f==4g||f==6P){1f 4g}1f 4W(a,f)}b.5l=j4(c.1z,c.1B,d.8K,e);if(b.5l!=T){1f 4W(a,b.5l)}if(!oG(a)){1f 4W(a,8F)}if(jf(b,c)!=T){1f 4W(a,b.5l)}a.4C=gR;if(!ja(b,c)){1f 4W(a,b.5l)}1f T}1e oI(a){1b b=1n(bb);1b c=a.4D;1b d=a.2S;1y(c.6p);b=c.2h;1g(;c.2o<c.2Z;++c.2o){1b e=c.2i[c.2o&(c.3h-1)];if(c.2p==0){jt(c)}1g(;c.2p<c.1S;c.2p++){1b f=(da);oD(c,e,f);if(!js(c,e)){oE(f,c,e);if(c.3h==1&&8d(a.1Y)>cV){1f 4W(a,2x)}1f 4g}ji(c);jb(c);if(c.3h==1){a.1Y.6E=e.1K-a.1Y.1K;1y(a.1Y.6E<=a.1Y.5s)}}if(!jd(c,d)){1f 4W(a,8G)}c.2p=0}if(!jg(c,d)){1f 4W(a,8G)}c.6p=0;a.4C=jD;1f T}1e jI(a){1b b=4g;1y(a.4D);if(a.4C==cW){b=oF(a)}if(a.4C==gQ){b=oH(a)}if(a.4C==gR){b=oI(a)}1f b}1e e1(a){1b b=1n(cZ);if(b==1i){1f 1i}b.4D=jl();if(b.4D==1i){b=\'\';1f 1i}b.4C=cW;oB(b.1Y);9w(b.2H);iK(b.2S);a7(b.7j);b.7j.1L=a?a:b.2H;jC(b.7j,b.2S);b.4D.6r=0;1f b}1q.EP=1e(a,b,c){1b d=1n(cZ);if(a!=1i&&b>0&&c!=1i){if(1q.mq(a,b,c.aC)!=T){1f 1i}}d=e1(c?c.1L:1i);if(!d){1f 1i}if(c!=1i){d.7j.8K=c.8K}1f d};1q.EQ=1e(a){if(!a)1f;jm(a.4D);oC(a.1Y);1q.j5(a.2H);a=\'\'};1q.ER=1e(a){a=a==\'mm\'?O:a;a=a==\'6M\'?6M:a;a=a==\'7D\'?7D:a;a=a==\'6N\'?6N:a;a=a==\'4r\'?4r:a;1b b=e1(1i);if(!b)1f 1i;b.2H.2e=a;1f b};1q.ES=1e(a,b,c,d){1b e=1n(cZ);if(a>=4r)1f 1i;e=e1(1i);if(e)1f 1i;e.2H.2e=a;e.2H.8E=1;e.2H.u.3w.5y=b;e.2H.u.3w.2U=d;e.2H.u.3w.3F=c;1f e};1q.ET=1e(a,b,c,d,u,e,f,g,v,h,i,j){1b k=e1(1i);if(k)1f 1i;k.2H.2e=4r;k.2H.8E=1;k.2H.u.1J.y=a;k.2H.u.1J.y=b;k.2H.u.1J.2d=d;k.2H.u.1J.aM=c;k.2H.u.1J.u=u;k.2H.u.1J.u=e;k.2H.u.1J.5W=g;k.2H.u.1J.aN=f;k.2H.u.1J.v=v;k.2H.u.1J.v=h;k.2H.u.1J.6O=j;k.2H.u.1J.aO=i;1f k};1e jJ(a){1y(a);if(a.4D==1i){1f 8G}if(a.4C==jE){1f 2x}if(a.4C==jD){1f T}1f 4g}1q.EU=1e(a,b,c){1b d=0;if(a==1i||b==1i){1f 2V}d=jJ(a);if(d!=4g){1f d}if(!jH(a.1Y,d9)){1f 2V}if(!oz(a,b,c)){1f 8F}1f jI(a)};1q.EV=1e(a,b,c){1b d=0;if(a==1i||b==1i){1f 2V}d=jJ(a);if(d!=4g){1f d}if(!jH(a.1Y,jF)){1f 2V}if(!oA(a,b,0,c)){1f 2V}1f jI(a)};1e gT(a){if(!a||!a.4D||a.4C<=gQ){1f 1i}1f a.7j.1L}1q.EW=1e(a,b,c,d,e){1b f=gT(a);if(b)b.1l=0;if(c)c.1l=0;if(f){if(d)d.1l=f.1z;if(e)e.1l=a.7j.7J}1k{if(d)d.1l=0;if(e)e.1l=0}1f f};1q.EX=1e(a,b,c,d,e){1b f=gT(a);if(!f)1f 1i;if(f.2e>=4r){1f 1i}if(4o b.1l!=="4I")b.1l=a.7j.7J;if(4o c.1l!=="4I")c.1l=f.1z;if(4o d.1l!=="4I")d.1l=f.1B;if(4o e.1l!=="4I")e.1l=f.u.3w.2U;1f f.u.3w.5y};1q.EY=1e(a,b,u,v,c,d,e,f){1b g=gT(a);if(!g)1f 1i;if(g.2e<4r){1f 1i}if(4o b.1l!=="4I")b.1l=g.u.1J.u;if(4o u.1l!=="4I")u.1l=g.u.1J.u;if(4o v.1l!=="4I")v.1l=g.u.1J.v;if(4o c.1l!=="4I")c.1l=g.1z;if(4o d.1l!=="4I")d.1l=g.1B;if(4o e.1l!=="4I")e.1l=g.u.1J.2d;if(4o f.1l!=="4I")f.1l=g.u.1J.5W;1f g.u.1J.y};1e EZ(a,b,c,d,e){if(!a||!a.4D||a.4C>cW){1f 0}a.2S.aQ=b;a.2S.9z=c;a.2S.8I=d;a.2S.9y=e;1f 1}1b co=12;1e gC(a,b,c,d){if(c.1l>=co&&!aK(a,b.1l,"7X",4)){if(aK(a,b.1l+8,"F0",4)){1f 0}1k{d.1l=8Z(a,b.1l+4);if(d.1l<co){1f 0}b.1l+=co;c.1l-=co}}1k{d.1l=0}1f 1}1e a7(a){if(a){}}1b cq=\'\',cr=\'\';1e e2(a,b,c,d){cr=1c jl();1b e=T;cq=1n(Y);1b f=1;1y(d);if(cr==1i){1f 2V}iK(cq);cq.6K=a;cq.5Z=b;cq.7H=c;jC(d,cq);cr.6r=0;if(!d2(cr,cq)){e=2x}1k{e=j4(cq.1z,cq.1B,d.8K,d.1L);if(e==T){if(!ju(cr,cq)){e=cr.5l}}}jm(cr);if(e!=T){1q.j5(d.1L)}1f e};1e a8(a,b,c,d,e,f){1b g=1n(ba);1b h=1n(R);if(d==1i){1f 1i}9w(h);a7(g);g.1L=h;h.2e=a;h.u.3w.5y=d;h.u.3w.7G=0;h.u.3w.2U=e;h.u.3w.3F=f;h.8E=1;if(e2(b,0,c,g)!=T){1f 1i}1f d}1e F1(a,b,c,d,e){1f a8(O,a,b,c,e,d)}1e F2(a,b,c,d,e){1f a8(6M,a,b,c,e,d)}1e F3(a,b,c,d,e){1f a8(7E,a,b,c,e,d)}1e F4(a,b,c,d,e){1f a8(7D,a,b,c,e,d)}1e F5(a,b,c,d,e){1f a8(6N,a,b,c,e,d)}1e F6(a,b,c,d,e,f,u,g,h,i,v,j,k,l){1b m=1n(ba);1b n=1n(R);if(c==1i)1f 1i;9w(n);a7(m);m.1L=n;n.2e=4r;n.u.1J.y=c;n.u.1J.2v=d;n.u.1J.2d=f;n.u.1J.aM=e;n.u.1J.u=u;n.u.1J.2s=g;n.u.1J.5W=i;n.u.1J.aN=h;n.u.1J.v=v;n.u.1J.2w=j;n.u.1J.6O=l;n.u.1J.aO=k;n.8E=1;if(e2(a,0,b,m)!=T){1f 1i}1f c}1b db=-1,7H=-1,oJ=-1;1b dc=-1;1e 9c(a,b,c,d,e,f){5Z={1l:0};c={1l:c};1b g=1n(ba);1b h=1n(R);9w(h);a7(g);g.1L=h;h.2e=a;1b o={5Z:{1l:0},1z:{1l:h.1z},1B:{1l:h.1B}};if(!oK(b,5Z,c,o.1z,o.1B)){1f 1i}h.1z=o.1z.1l;h.1B=o.1B.1l;if(d)d.1l=h.1z.1l;if(e)e.1l=h.1B.1l;if(e2(b,5Z.1l,c.1l,g)!=T){1f 1i}if(f){j6(h,f)}1f(a>=4r)?h.u.1J.y:h.u.3w.5y}1q.F7=1e(a,b,c,d){1f 9c(O,a,b,c,d,1i)};1q.F8=1e(a,b,c,d){1f 9c(6M,a,b,c,d,1i)};1q.F9=1e(a,b,c,d){1f 9c(7F,a,b,c,d,1i)};1q.Fa=1e(a,b,c,d){1f 9c(7E,a,b,c,d,1i)};1q.Fb=1e(a,b,c,d){1f 9c(7D,a,b,c,d,1i)};1q.Fc=1e(a,b,c,d){1f 9c(6N,a,b,c,d,1i)};1e jK(a){1y(a);a.mp=0}1e gU(a,b,c,d){1b e={1l:0};1b f={1l:0};1b g={1l:0};1b h={1l:0};1b i={1l:0};if(d==1i){1f 2V}jK(d);if(a==1i||b==1i||c.1l==0){1f 2V}if(!gC(a,b,c,f)){1f 2x}if(!gA(a,b,c,h,d.1z,d.1B,g)){1f 2x}if(h.1l>0){1f T}if(!gz(a,b,c,i,e,f)){1f 2x}if(i.1l==-1){1f 2x}if(!i.1l){e.1l=c.1l}if(!jo(a,b,c,e,d.1z,d.1B,d.mo)){1f 2x}1f T}1e oK(a,b,c,d,e){1b f=1n(U);if(gU(a,b,c,f)!=T){1f 0}if(d){d.1l=f.1z}if(e){e.1l=f.1B}1f 1}1e mu(a,b){if(b!=N){1f 0}if(a==1i){1f 0}jK(a.aC);9w(a.1L);1f 1}1e mr(a,b,c,d){if(d!=N){1f 2V}if(c==1i){1f 2V}1b e={1l:0};1b b={1l:b};1f gU(a,e,b,c)}1q.Fd=1e(a,b,c){1b d=1n(ba);1b e=\'fR\';if(!c){1f 2V}1b f={1l:0};b={1l:b};e=gU(a,f,b,c.aC);if(e!=T){1f e}a7(d);d.1L=c.1L;d.8K=c.mt;e=e2(a,f.1l,b.1l,d);1f e};1b dd,1B;1b db=-1,7H=-1,dd=-1,1B=-1,oJ=-1;1b dc=-1}1e Fe(){1b N=mk;1b O={8e:aE,8f:1h,7k:aE,8g:1h,5N:1h,3Y:1h,4E:1h,5t:1h,7l:1h,7m:1h,7n:1h,8h:1h,8i:1h,6z:1h,8j:1h,9d:1h};1b P={gV:0,oL:1,oM:2,oN:3,oO:4,oP:5};1e oQ(a,b,c){1f oR(a,b,c,N)}1b S={6F:1p(4,aE),7o:1h,e3:1p(3,1h),9e:1p(2,1h),e4:3m(1c 1d(3,4),1h),jL:1p(4,1h),jM:1p(4,1h),jN:1p(4,1h),jO:1h,oS:1h};1b T=0,jP=1,jQ=2,jR=3,gW=3,Ff=4,Fg=5,Fh=6,Fi=7,a9=4;1b U=0,oT=1,gX=2,jS=3,oU=4,jT=5,oV=6,oW=7,jU=8;1b V={2e:\'Fj\',1z:1h,1B:1h,y:1m,u:1m,v:1m,2v:0,2s:0,2w:0,2d:1h,2j:1h,a:1m,3u:0,3v:1h,7p:1e Fk(){},jV:aD,9f:1h,5u:1m,3Z:1n(S),aa:1,u0:1m,v0:1m,gY:0,gZ:0,jW:1h,oX:\'Fl\'};1e oY(a){1f oZ(a,N)}1b Y={2f:6L,3x:6L,7q:1h,4X:1h,1R:1m,1K:0,5O:3c,ab:3c,h0:1h};1e 9g(a){1f(a.5O+a.7q)*8+8+a.4X}1e jX(a){1f a.1R}1e 9h(a){1f a.5O}1b Z=0;1b ba=1;1b bb=2;1b bc=64;1b bd=0,9K=1,9L=2,9M=3,fX=4,iS=5,b0=6,fY=7,fZ=8,b1=9,b2=(b1+1-bd),b3=bd,9N=9L,9O=9M,9P=9K;1b be=4,b4=8,6k=4,6l=8,5E=3,6U=11,e5=64,9i=67;1b bf=16;1b bg=(bf*16);1b bh=(bf*8);1b bi=(bg+bh);1b bj=(6*16*bf+12*bf);1b bk=(0);1b bl=(bg);1b bm=(bl+8);1b bn=15;1b bo=(0*16*bf);1b bp=(1*16*bf);1b bq=(2*16*bf);1b br=(3*16*bf);1b bs=(4*16*bf);1b bt=(4*16*bf+8*bf);1b bu=(5*16*bf);1b bv=(5*16*bf+8*bf);1b bw=(6*16*bf+0);1b bx=(6*16*bf+4);1b by=(6*16*bf+8);1b bz=(6*16*bf+12);1b bA=(6*16*bf+4*bf+0);1b bB=(6*16*bf+4*bf+4);1b bC=(6*16*bf+4*bf+8);1b bD=(6*16*bf+4*bf+12);1b bE=(6*16*bf+8*bf+0);1b bF=(6*16*bf+8*bf+4);1b bG=(6*16*bf+8*bf+8);1b bH=Fm;1b bI=17;1e jY(b){1f((b)<<(bI-8))}1e jZ(n,a,B){1f((n*a+B)>>bI)}1b bJ=3m(1c 1d(5E,6U),1m);1b bK=3m(1c 1d(5E,6U,2),3b);1b bL=3m(1c 1d(5E,(9i+1)),5d);1b bM=3m(1c 1d(be,e5),3t);1b bN={8k:1h,4Q:1h,e6:1h};1b bO={4w:1p(3,1m),9j:1m,2M:3m(1c 1d(6k,6l),bJ),k0:3m(1c 1d(6k,6l),bK),h1:3m(1c 1d(6k,6l),bL),5m:1h,h2:1h};1b bP={7N:1h,6V:1h,6m:1h,e7:1h};1b bQ={4Y:0,e8:0,4x:0,1Z:0,9k:1m};1b bR={3A:1p(16,5d),h3:1p(16,5d),k1:1p(16,5d),k2:1p(16,5d),h4:1p(16,5d)};1b bS={8l:1n(bR),e9:1n(bR),ac:1n(bR),9k:1h,k3:1h,5P:1h,9l:1h,k4:1h,k5:1h,k6:1h,h5:1h,Fn:1h,h6:1h,k7:1h,k8:1h,k9:1h};1b bT={2t:1n(O),2I:1n(V),3S:1n(bP),2Y:1n(bN),9R:1h,1S:1h,2Z:1h,5v:1h,3h:1h,7r:1n(Y),2i:9v(b4,Y),9m:1h,3T:1m,c1:0,4j:3c,9n:1h,h7:Y,8R:1m,j2:0,5G:3c,1T:9v(be,bS),h8:1h,8m:1h,h9:1h,ha:1h,hb:1h,hc:1h,hd:1h,1X:1n(bO),Fo:0,9o:1p(3,3b),he:3b,ka:1h,kb:3m(1c 1d(3,4),1h),f0:1p(3,1h),5Q:1h,kc:1h,hf:1h,3y:1n(bQ),p3:0,3N:1m,3B:0,2g:2C,4F:0,2T:1m,3q:0,3j:1m,3O:0,4G:1m,5R:0,4l:1m,5w:0,7s:1m,8n:0,9p:1m,ad:0,7t:1m,7u:0,8o:1m,8p:0,ae:1m,af:0,4Z:1n(bM)};1b bU={D:4J,SD:4J,R:4J,2O:4J,8q:1p(16,4q),4H:3m(1c 1d(16,16),4q),7v:3m(1c 1d(4+4,16),4q),hg:1h,hh:1p(16,1h),hi:1h,nz:2C};1b bV={2P:1h,3r:1h,p4:1h,p5:1h,p6:1h,p7:1h,2T:1m,3q:0,3j:1m,3O:0,4G:1m,5R:0,4l:1m,5w:0,1x:1n(bT),2B:1n(bQ),2u:0,7r:1n(Y),3N:1m,3B:0,2g:2C,4F:0,8r:1p(37,1m),Fp:0,f1:1m,f2:0,1V:1h,1C:1p(9,1h),1E:1p(9,1h),f3:3m(1d(4,3),3b),hj:3b,hk:3b,4Z:1n(bM),8s:1h,kd:1h};1b bW=ke;1e p8(a,b,c,d,e,f){1b g=fA.md(a.8B(b,b+c),(f?3:6));d.7w=g;e.7w=g.1w;1f 1}1e p9(a){a.9m=(a.2I.a!=1i)+0;a.3T=1i;a.4j=0}1e pa(a){}1e pb(a){if(a.9m){1b b=a.2I;1y(b.a);a.3T={7w:a.3T};a.4j={7w:a.jO};if(!p8(b.a,0,b.1z*b.1B,a.3T,a.4j,a.2t.9d)){1f 0}a.3T=a.3T.7w;a.4j=a.4j.7w}1f 1}1e pc(a){a.3T=\'\';a.3T=1i;a.4j=0;a.9m=0}1e pd(a){a.9n=(a.2I.u0!=1i)+0;a.5G=0;a.8R=1i;if(a.9n){hl(a.h7,a.1S*a.2Z*3)}}1e pe(a){}1e pf(a){if(a.9n){a.8R=hm(a.h7);a.5G=9h(a.h7)}1f 1}1e pg(a){a.8R=\'\'}1b bX=Fq;1b bY=10;1b bZ=20;1b ca=(bZ-8);1b cb=(1<<19);1b cc=(1<<24);1e kf(a,b,c){a[b+0]=(c>>0)&1v;a[b+1]=(c>>8)&1v;a[b+2]=(c>>16)&1v;a[b+3]=(c>>24)&1v}1e ph(a,b,c,d){1b e=1p(bY,1m);1b f=1c 1d(\'R\',\'I\',\'F\',\'F\',0,0,0,0,\'W\',\'E\',\'B\',\'P\',\'V\',\'P\',\'8\',\' \');1b g=2C;if(b>=cb){1f 4m(d,oV)}1g(1b i=0;i<f.1w;++i){f[i]=f[i]!=\'0\'?iH(f[i]).mg(0):0}kf(f,+4,c+ca);kf(f,+16,c);if(!d.7p(f,1F(f)*f.1w,d)){1f 4m(d,jU)}g=0|(a<<1)|(1<<4)|(b<<5);e[0]=g&1v;e[1]=(g>>8)&1v;e[2]=(g>>16)&1v;e[3]=(bX>>16)&1v;e[4]=(bX>>8)&1v;e[5]=(bX>>0)&1v;e[6]=d.1z&1v;e[7]=d.1z>>8;e[8]=d.1B&1v;e[9]=d.1B>>8;1f d.7p(e,1F(e)*e.1w,d)}1e pi(a,b){1b c=b.2Y;1b d=b.1X;if(4a(a,(c.8k>1))){1b e=1;1b s;4a(a,c.4Q);if(4a(a,e)){4a(a,1);1g(s=0;s<be;++s){7x(a,b.1T[s].5P,7)}1g(s=0;s<be;++s){7x(a,b.1T[s].9l,6)}}if(c.4Q){1g(s=0;s<3;++s){if(4a(a,(d.4w[s]!=1a))){5a(a,d.4w[s],8)}}}}}1e pj(a,b){1b c=(b.e7!=0)+0;4a(a,b.7N);5a(a,b.6V,6);5a(a,b.6m,3);if(4a(a,c)){1b d=(b.e7!=0);if(4a(a,d)){5a(a,0,4);7x(a,b.e7,6);5a(a,0,3)}}}1e pk(a,b){5a(a,b.h8,7);7x(a,b.h9,4);7x(a,b.ha,4);7x(a,b.hb,4);7x(a,b.hc,4);7x(a,b.hd,4)}1e pl(a,b){1b c=1p(3*(b4-1),1m);1b p;1g(p=0;p<a.3h-1;++p){1b d=9h(a.2i[p]);if(d>=cc){1f 4m(b,oW)}c[3*p+0]=(d>>0)&1v;c[3*p+1]=(d>>8)&1v;c[3*p+2]=(d>>16)&1v}1f p?b.7p(c,3*p,b):1}1b cd=8;1e kg(a,b,c){a[b+0]=(c>>0)&1v;a[b+1]=(c>>8)&1v;a[b+2]=(c>>16)&1v}1e pm(a){1b b=1p(cd,1m);1b c=a.7r;1b d=a.2I;kg(b,+0,a.5G);b[3]=a.2I.2e&gW;if(a.5G>0){1y(a.9n);if(!hn(a.2i[a.3h-1],a.8R,a.j2,a.5G)){1f 4m(d,gX)}}kg(b,+4,a.4j);if(a.4j>0){1y(a.9m);if(!hn(c,a.3T,a.c1,a.4j)){1f 4m(d,gX)}}b[cd-1]=8S;if(!hn(c,b,0,cd)){1f 4m(d,gX)}1f 1}1e pn(a){1b b=a.7r;1b c=a.1S*a.2Z;1b d=3b,8t=3b,ag=3b;1b e=a.9m||a.9n;d=9g(b);hl(b,1t(c*7/8));4a(b,e);4a(b,0);pi(b,a);pj(b,a.3S);5a(b,a.2t.6z,2);pk(b,a);4a(b,0);po(b,a.1X);8t=9g(b);pp(a);hm(b);if(e&&!pm(a)){1f 0}ag=9g(b);if(a.2I.aa){a.2I.3Z.9e[0]=1t((8t-d+7)>>3);a.2I.3Z.9e[1]=1t((ag-8t+7)>>3);a.2I.3Z.jO=a.4j;a.2I.3Z.oS=a.5G}1f!b.h0}1e pq(a){1b b=a.2I;1b c=a.7r;1b d=0;1b e=3c,ho=3c;1b p;d=pn(a);e=bY+9h(c)+3*(a.3h-1);1g(p=0;p<a.3h;++p){e+=9h(a.2i[p])}ho=e&1;e+=ho;{1b f=jX(c);1b g=9h(c);d=d&&ph(a.9R,g,e,b)&&b.7p(f,g,b)&&pl(a,b);f=\'\'}1g(p=0;p<a.3h;++p){1b h=jX(a.2i[p]);1b i=9h(a.2i[p]);if(i)d=d&&b.7p(h,i,b);h=\'\'}if(d&&ho){1b j=1c 1d(0);d=b.7p(j,1,b)}a.ka=e+bZ;1f d}1b ce=1p(1a+1a+1,1m);1b cf=1p(1a+1a+1,1m);1b cg=1p(4k+4k+1,8C);1b ci=1p(112+112+1,8C);1b cj=1p(1a+ga+1,1m);1b ck=0;1e hp(a){if(!ck){1b i;1g(i=-1a;i<=1a;++i){ce[1a+i]=(i<0)?-i:i;cf[1a+i]=ce[1a+i]>>1}1g(i=-4k;i<=4k;++i){cg[4k+i]=(i<-128)?-128:(i>127)?127:i}1g(i=-112;i<=112;++i){ci[112+i]=(i<-16)?-16:(i>15)?15:i}1g(i=-1a;i<=1a+1a;++i){cj[1a+i]=(i<0)?0:(i>1a)?1a:i}ck=1}}1e 7e(p,b,c){1b d=p[b-2*c],p0=p[b-c],q0=p[b+0],q1=p[b+c];1b a=3*(q0-p0)+cg[4k+d-q1];1b e=ci[112+((a+4)>>3)];1b f=ci[112+((a+3)>>3)];p[b-c]=cj[1a+p0+f];p[b+0]=cj[1a+q0-e]}1e gl(p,b,c){1b d=p[b-2*c],p0=p[b-c],q0=p[b+0],q1=p[b+c];1b a=3*(q0-p0);1b e=ci[112+((a+4)>>3)];1b f=ci[112+((a+3)>>3)];1b g=(e+1)>>1;p[b-2*c]=cj[1a+d+g];p[b-c]=cj[1a+p0+f];p[b+0]=cj[1a+q0-e];p[b+c]=cj[1a+q1-g]}1e c4(p,a,b,c){1b d=p[a-2*b],p0=p[a-b],q0=p[a+0],q1=p[a+b];1f(ce[1a+d-p0]>c)||(ce[1a+q1-q0]>c)}1e 9Y(p,a,b,c){1b d=p[a-2*b],p0=p[a-b],q0=p[a+0],q1=p[a+b];1f(2*ce[1a+p0-q0]+cf[1a+d-q1])<=c}1e c5(p,a,b,t,c){1b d=p[a-4*b],p2=p[a-3*b],p1=p[a-2*b],p0=p[a-b];1b e=p[a+0],q1=p[a+b],q2=p[a+2*b],q3=p[a+3*b];if((2*ce[1a+p0-e]+cf[1a+p1-q1])>t)1f 0;1f ce[1a+d-p2]<=c&&ce[1a+p2-p1]<=c&&ce[1a+p1-p0]<=c&&ce[1a+q3-q2]<=c&&ce[1a+q2-q1]<=c&&ce[1a+q1-e]<=c}1e c6(p,a,b,c){1b i;1g(i=0;i<16;++i){if(9Y(p,a+i,b,c)){7e(p,a+i,b)}}}1e c7(p,a,b,c){1b i;1g(i=0;i<16;++i){if(9Y(p,a+i*b,1,c)){7e(p,a+i*b,1)}}}1e gm(p,a,b,c){1b k;1g(k=3;k>0;--k){a+=4*b;c6(p,a,b,c)}}1e gn(p,a,b,c){1b k;1g(k=3;k>0;--k){a+=4;c7(p,a,b,c)}}1e 4z(p,a,b,c,d,e,f,g){1s(d-->0){if(c5(p,a,b,e,f)){if(c4(p,a,b,g)){7e(p,a,b)}1k{gl(p,a,b)}}a+=c}}1e go(p,a,b,c,d,e){1b k;1g(k=3;k>0;--k){a+=4*b;4z(p,a,b,1,16,c,d,e)}}1e gp(p,a,b,c,d,e){1b k;1g(k=3;k>0;--k){a+=4;4z(p,a,1,b,16,c,d,e)}}1e gq(u,a,v,b,c,d,e,f){4z(u,a+4*c,c,1,8,d,e,f);4z(v,b+4*c,c,1,8,d,e,f)}1e gr(u,a,v,b,c,d,e,f){4z(u,a+4,1,c,8,d,e,f);4z(v,b+4,1,c,8,d,e,f)}1e pr(p,a,b,c,d,e){go(p,a,b,c,d,e)};1e ps(p,a,b,c,d,e){gp(p,a,b,c,d,e)};1e pt(u,a,v,b,c,d,e,f){gq(u,a,v,b,c,d,e,f)};1e pu(u,a,v,b,c,d,e,f){gr(u,a,v,b,c,d,e,f)};1e pv(p,a,b,c){gm(p,a,b,c)};1e pw(p,a,b,c){gn(p,a,b,c)};1e px(a,b){if(a>0){if(a>4){b>>=2}1k{b>>=1}if(b>9-a){b=9-a}}if(b<1)b=1;1f b}1e gs(a,b){1b c=a.1x;1b d=px(c.2t.5t,b);1b e=2*b+d;1b f=a.4G;1b g=a.5R+bk;1b h=a.4G;1b i=a.5R+bl;1b j=a.4G;1b k=a.5R+bm;1u(f,g,a.3j,a.3O,bi*1F(1m));if(c.3S.7N==1){pw(f,g,bf,e);pv(f,g,bf,e)}1k{1b l=(b>=40)?2:(b>=15)?1:0;ps(f,g,bf,e,d,l);pu(h,i,j,k,bf,e,d,l);pr(f,g,bf,e,d,l);pt(h,i,j,k,bf,e,d,l)}}1b cl=3;1b cm={w:3t,xm:3t,ym:3t,hq:3t,hr:3t,hs:3t};1e ht(a,b,c,d,e,f,g,h,W,H,i){1b j=(h-cl<0)?0:h-cl;1b k=(h+cl>H-1)?H-1:h+cl;1b l=(g-cl<0)?0:g-cl;1b m=(g+cl>W-1)?W-1:g+cl;1b x,y;b+=j*c;e+=j*f;1g(y=j;y<=k;++y,b+=c,e+=f){1g(x=l;x<=m;++x){1b n=a[b+x];1b o=d[e+x];i.w+=1;i.xm+=n;i.ym+=o;i.hq+=n*n;i.hr+=n*o;i.hs+=o*o}}}1e py(a){1b b=a.xm*a.xm;1b c=a.ym*a.ym;1b d=a.xm*a.ym;1b e=a.w*a.w;1b f=a.hq*a.w-b;1b g=a.hs*a.w-c;1b h=a.hr*a.w-d;1b i=3t,C2=3t;1b j=3t;1b k=3t;if(f<0.)f=0.;if(g<0.)g=0.;i=6.kh*e;C2=58.Fr*e;j=(2*d+i)*(2*h+C2);k=(b+c+i)*(f+g+C2);1f(k!=0)?j/k:0.}1e ki(a,b,c,d){1b x,y;1b s={w:3t,xm:3t,ym:3t,hq:3t,hr:3t,hs:3t};1g(x=3;x<13;x++){1g(y=3;y<13;y++){ht(a,b+bk,bf,c,d+bk,bf,x,y,16,16,s)}}1g(x=1;x<7;x++){1g(y=1;y<7;y++){ht(a,b+bl,bf,c,d+bl,bf,x,y,8,8,s);ht(a,b+bm,bf,c,d+bm,bf,x,y,8,8,s)}}1f py(s)}1e pz(a){1b s,i;if(!a.4Z)1f;hp();1g(s=0;s<be;s++){1g(i=0;i<e5;i++){a.4Z[s][i]=0}}}1e pA(a){1b d=1h;1b s=a.2B[a.2u].1Z;1b b=a.1x.1T[s].9l;1b c=-a.1x.1T[s].5P;1b e=a.1x.1T[s].5P;1b f=(e-c>=4)?4:1;if(!a.4Z)1f;if(a.2B[a.2u].4Y==1&&a.2B[a.2u].4x)1f;a.4Z[s][0]+=ki(a.2T,a.3q,a.3j,a.3O);1g(d=c;d<=e;d+=f){1b g=b+d;if(g<=0||g>=e5){4n}gs(a,g);a.4Z[s][g]+=ki(a.2T,a.3q,a.4G,a.5R)}}1e pB(a){1b s;1b b=a.1x;if(!a.4Z){1f}1g(s=0;s<be;s++){1b i,kj=0;1b c=1.Fs*a.4Z[s][0];1g(i=1;i<e5;i++){1b v=a.4Z[s][i];if(v>c){c=v;kj=i}}b.1T[s].9l=kj}}1e hu(a,b){1b c=1m;1b d=0;1b e=3c;1b f=a.5O+b;if(f<=a.ab)1f 1;e=2*a.ab;if(e<f)e=f;if(e<6H)e=6H;c=4f(e,1m);if(c==1i){a.h0=1;1f 0}if(a.5O>0)1u(c,d,a.1R,a.1K,a.5O);a.1R=\'\';a.1R=c;a.1K=d;a.ab=e;1f 1}1e hv(a){1b s=8+a.4X;1b b=a.3x>>s;1y(a.4X>=0);a.3x-=b<<s;a.4X-=8;if((b&1v)!=1v){1b c=a.5O;if(c+a.7q>=a.ab){if(!hu(a,a.7q+1)){1f}}if(b&gD){if(c>0)a.1R[c-1]++}if(a.7q>0){1b d=(b&gD)?pC:1v;1g(;a.7q>0;--a.7q)a.1R[c++]=d}a.1R[c++]=(b>1a?b-1I:b);a.5O=c}1k{a.7q++}}1b cn=1c 1d(7,6,6,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0);1b co=1c 1d(127,127,2W,127,3I,2W,2m,127,143,3I,2X,2W,4L,2m,3d,127,135,143,4M,3I,4h,2X,1O,2W,4t,4L,5h,2m,4u,3d,2D,127,131,135,139,143,147,4M,3e,3I,3s,4h,1G,2X,3Q,1O,4N,2W,3E,4t,5i,4L,3f,5h,2k,2m,4p,4u,4O,3d,2E,2D,1A,127,129,131,133,135,137,139,141,143,145,147,149,4M,9H,3e,4v,3I,6S,3s,4P,4h,9I,1G,5A,2X,6h,3Q,5B,1O,6i,4N,5C,2W,3P,3E,5j,4t,3J,5i,1P,4L,2F,3f,2l,5h,5D,2k,2G,2m,3R,4p,9J,4u,fW,4O,aY,3d,3g,2E,3n,2D,2n,1A,1r,127);1e 1D(a,b,c){b=b?1:0;1b d=(a.2f*c)>>8;if(b){a.3x+=d+1;a.2f-=d+1}1k{a.2f=d}if(a.2f<127){1b e=cn[a.2f];a.2f=co[a.2f];a.3x<<=e;a.4X+=e;if(a.4X>0)hv(a)}1f b}1e 4a(a,b){b=b?1:0;1b c=a.2f>>1;if(b){a.3x+=c+1;a.2f-=c+1}1k{a.2f=c}if(a.2f<127){a.2f=co[a.2f];a.3x<<=1;a.4X+=1;if(a.4X>0)hv(a)}1f b}1e 5a(a,b,c){1b d;1g(d=1<<(c-1);d;d>>=1)4a(a,b&d)}1e 7x(a,b,c){if(!4a(a,b!=0))1f;if(b<0){5a(a,((-b)<<1)|1,c+1)}1k{5a(a,b<<1,c+1)}}1e hl(a,b){a.2f=1a-1;a.3x=0;a.7q=0;a.4X=-8;a.5O=0;a.ab=0;a.h0=0;a.1R=1i;1f(b>0)?hu(a,b):1}1e hm(a){5a(a,0,9-a.4X);a.4X=0;hv(a);1f a.1R}1e hn(a,b,c,d){1y(b);if(a.4X!=-8)1f 0;if(!hu(a,d))1f 0;1u(a.1R,a.1K+a.5O,b,c,d);a.5O+=d;1f 1}1e 2J(a,b){1f!a?cp[b]:cp[1a-b]}1e kk(a,b,c){1f a*2J(1,c)+(b-a)*2J(0,c)}1e hw(a,b){1f cr[b]+a[b>9i?9i:b]}1b cp=1c 1d(f4,f4,f4,pD,pD,Ft,kl,km,km,hx,Fu,kn,ko,kp,Fv,6H,6H,pE,pF,hy,pG,Fw,Fx,pH,pI,pJ,Fy,Fz,FA,FB,pK,pL,pL,FC,pM,FD,pN,FE,FF,FG,FH,FI,pO,FJ,FK,hz,FL,FM,FN,FO,FP,pP,pQ,FQ,pR,FR,FS,FT,FU,FV,pS,FW,pT,iu,iu,FX,FY,FZ,pU,G0,pV,G1,G2,G3,G4,G5,G6,G7,G8,G9,Ga,pW,pX,Gb,Gc,Gd,pY,Ge,Gf,Gg,c8,c8,Gh,Gi,pZ,Gj,q4,Gk,Gl,Gm,Gn,kq,kq,q5,Go,q6,Gp,q7,Gq,q8,Gr,Gs,q9,qa,qb,Gt,Gu,aB,m1,Gv,iw,Gw,gu,Gx,qc,Gy,Gz,1I,1I,1I,1A,2q,3n,5I,3V,aY,2A,5L,4T,4U,2m,2G,4V,7f,8V,3f,8X,1P,5i,3J,4A,3L,3a,2W,5M,4N,1O,5B,3Q,4B,2X,1G,1G,d0,4P,3s,3M,3I,jj,3o,4S,8W,148,146,144,142,139,138,135,133,131,128,128,125,123,121,119,117,115,113,111,110,107,105,103,102,100,98,96,94,92,91,89,86,86,83,82,80,77,76,74,73,71,69,67,66,64,63,61,59,57,55,54,52,51,49,47,46,44,43,41,40,38,36,35,33,32,30,29,27,25,24,22,21,19,18,16,15,13,12,10,9,7,6,4,3);1b cq=1c 1d(1c 1d(qd,GA),1c 1d(GB,qd),1c 1d(qe,GC),1c 1d(qe,GD),1c 1d(ah,jr),1c 1d(ah,jr),1c 1d(ah,hA),1c 1d(ah,hA),1c 1d(ah,hA),1c 1d(ah,hA),1c 1d(2K,8u),1c 1d(2K,8u),1c 1d(2K,8u),1c 1d(2K,8u),1c 1d(2K,8u),1c 1d(2K,8u),1c 1d(2K,8u),1c 1d(2K,8u),1c 1d(2K,4b),1c 1d(2K,4b),1c 1d(2K,4b),1c 1d(2K,4b),1c 1d(2K,4b),1c 1d(2K,4b),1c 1d(2K,4b),1c 1d(2K,4b),1c 1d(2K,4b),1c 1d(2K,4b),1c 1d(2K,4b),1c 1d(2K,4b),1c 1d(2K,4b),1c 1d(2K,4b),1c 1d(2K,4b),1c 1d(2K,4b),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1W),1c 1d(1N,1N));1b cr=1c 1d(0,1I,1I,1I,1I,qf,GE,GF,GG,hz,hz,GH,hB,GI,GJ,qg,GK,qh,qi,GL,qj,GM,qk,kr,GN,ks,GO,kt,ql,hC,qm,GP,hD,GQ,GR,km,GS,GT,GU,GV,GW,GX,hC,ku,qn,qo,GY,GZ,qp,f5,H0,qq,H1,qr,qs,H2,H3,qt,qu,qv,kv,H4,H5,qw,qx,H6,H7,H8,qy,H9,Ha,qz,Hb,Hc,qA,qB,Hd,qC,qD,He,Hf,qE,qw,qF,qG,qH,Hg,qI,qJ,hE,qK,qL,qM,Hh,Hi,Hj,Hk,Hl,Hm,Hn,Ho,Hp,qN,kw,Hq,Hr,Hs,Ht,Hu,Hv,qO,Hw,qP,Hx,Hy,Hz,HA,HB,qQ,HC,qR,HD,HE,HF,HG,HH,HI,HJ,HK,HL,HM,HN,HO,qS,qT,HP,qU,HQ,HR,HS,qV,HT,HU,HV,HW,HX,HY,HZ,kx,I0,I1,I2,I3,I4,I5,qW,I6,I7,I8,I9,qX,Ia,Ib,Ic,Id,Ie,If,Ig,Ih,Ii,Ij,Ik,Il,Im,In,Io,Ip,Iq,Ir,qY,Is,qZ,It,r0,Iu,r1,Iv,Iw,Ix,Iy,Iz,IA,IB,IC,ID,IE,IF,IG,IH,II,IJ,IK,IL,IM,qY,IN,qZ,IO,r0,IP,r1,IQ,IR,IS,IT,IU,IV,IW,IX,IY,IZ,J0,J1,J2,J3,J4,J5,J6,J7,J8,J9,Ja,Jb,Jc,Jd,Je,Jf,Jg,Jh,Ji,Jj,Jk,Jl,Jm,Jn,Jo,Jp,Jq,Jr,Js,Jt,Ju,Jv,Jw,Jx,Jy,Jz,JA,JB,JC,JD,JE,JF,JG,JH,JI,JJ,JK,JL,JM,JN,JO,r2,JP,JQ,JR,JS,JT,JU,JV,JW,JX,JY,JZ,K0,K1,K2,K3,K4,K5,K6,K7,K8,K9,Ka,Kb,Kc,Kd,Ke,Kf,Kg,Kh,Ki,Kj,Kk,Kl,Km,Kn,Ko,Kp,Kq,Kr,Ks,Kt,Ku,Kv,Kw,Kx,Ky,Kz,KA,KB,KC,KD,KE,KF,KG,KH,KI,KJ,KK,KL,KM,KN,KO,KP,KQ,KR,KS,KT,KU,KV,KW,KX,KY,KZ,L0,L1,L2,L3,L4,L5,L6,L7,L8,L9,La,Lb,Lc,Ld,Le,Lf,Lg,Lh,Li,Lj,Lk,Ll,Lm,Ln,Lo,Lp,r3,Lq,Lr,Ls,Lt,Lu,Lv,Lw,Lx,Ly,Lz,LA,LB,LC,LD,LE,LF,LG,r4,LH,LI,LJ,LK,LL,LM,LN,LO,LP,LQ,LR,LS,LT,LU,LV,LW,LX,LY,LZ,M0,M1,M2,M3,M4,M5,M6,M7,M8,M9,Ma,Mb,Mc,Md,Me,Mf,Mg,Mh,r5,Mi,Mj,Mk,Ml,Mm,Mn,r6,Mo,r7,Mp,r8,Mq,r9,Mr,Ms,Mt,Mu,Mv,Mw,Mx,My,Mz,MA,ky,MB,MC,MD,ME,MF,MG,MH,r6,MI,r7,MJ,r8,MK,r9,ML,kz,MM,MN,MO,MP,MQ,MR,kA,MS,kB,MT,MU,MV,MW,MX,MY,kC,MZ,N0,N1,N2,N3,N4,N5,N6,N7,N8,N9,Na,Nb,Nc,Nd,kD,Ne,Nf,Ng,Nh,Ni,Nj,Nk,Nl,Nm,Nn,No,Np,Nq,Nr,Ns,kE,Nt,Nu,Nv,Nw,Nx,Ny,Nz,NA,NB,NC,ND,NE,NF,NG,NH,kF,NI,NJ,NK,NL,NM,NN,kG,NO,kH,NP,NQ,NR,NS,NT,NU,kI,NV,NW,NX,NY,NZ,O0,O1,O2,O3,O4,O5,O6,O7,O8,O9,kJ,Oa,Ob,Oc,Od,Oe,Of,Og,Oh,Oi,Oj,Ok,Ol,Om,On,ra,rb,rc,rd,re,rf,rg,rh,ri,rj,rk,rl,rm,rn,ky,ro,rp,rq,rr,rs,rt,ru,rv,rw,rx,ry,rz,rA,rB,rC,kz,rD,rE,rF,rG,rH,rI,kA,rJ,kB,rK,rL,rM,rN,rO,rP,kC,rQ,rR,rS,rT,rU,rV,rW,rX,rY,rZ,s0,s1,s2,s3,s4,kD,s5,s6,s7,s8,s9,sa,sb,sc,sd,se,sf,sg,sh,si,sj,kE,sk,sl,sm,sn,so,sp,sq,sr,ss,st,su,sv,sw,sx,sy,kF,sz,sA,sB,sC,sD,sE,kG,sF,kH,sG,sH,sI,sJ,sK,sL,kI,sM,hF,sN,hG,sO,hH,sP,hI,sQ,sR,sS,sT,sU,sV,sW,kJ,sX,sY,sZ,t0,t1,t2,t3,t4,t5,t6,hF,t7,hG,t8,hH,t9,hI,ta,tb,tc,td,te,tf,tg,th,ti,tj,tk,tl,tm,tn,tp,tq,tr,ts,tt,tu,tv,tw,tx,ty,tz,tA,tB,tC,tD,tE,tF,tG,tH,tI,tJ,tK,tL,tM,tN,tO,tP,tQ,tR,tS,tT,tU,tV,tW,tX,tY,tZ,u1,u2,u3,u4,u5,u6,u7,u8,u9,ua,ub,uc,ud,ue,uf,ug,uh,ui,uj,uk,ul,um,un,uo,up,kh,uq,ur,us,ut,uu,uv,uw,ux,uy,uz,uA,uB,uC,uD,uE,uF,uG,uH,uI,uJ,uK,uL,uM,uN,uO,uP,uQ,uR,uS,uT,uU,uV,uW,uX,uY,uZ,v1,v2,v3,v4,v5,v6,v7,v8,v9,va,vb,vc,vd,ve,vf,vg,vh,vi,vj,vk,vl,vm,vn,vo,vp,vq,vr,vs,vt,vu,vv,vw,vx,vy,vz,vA,vB,vC,vD,vE,vF,vG,vH,vI,vJ,vK,vL,vM,vN,vO,vP,vQ,vR,vS,vT,vU,vV,vW,vX,vY,vZ,w0,w1,w2,w3,w4,w5,w6,w7,w8,w9,wa,wb,wc,wd,wf,wg,wh,wi,wj,wk,wl,wm,wn,wo,wp,wq,wr,ws,wt,wu,wv,ww,wx,wy,wz,wA,wB,wC,wD,wE,wF,wG,wH,wI,wJ,wK,wL,wM,wN,wO,hJ,wP,hK,wQ,hL,wR,hM,wS,wT,wU,wV,wW,wX,wY,wZ,x0,x1,kK,x2,x3,x4,x5,x6,x7,x8,hJ,x9,hK,xa,hL,xb,hM,xc,kL,xd,xe,xf,xg,xh,xi,kM,xj,kN,xk,xl,xn,xo,xp,xq,kO,xr,xs,xt,xu,xv,xw,xx,xy,xz,xA,xB,xC,xD,xE,xF,kP,xG,xH,xI,xJ,xK,xL,xM,xN,xO,xP,xQ,xR,xS,xT,xU,kQ,xV,xW,xX,xY,xZ,y0,y1,y2,y3,y4,y5,y6,y7,y8,y9,kR,ya,yb,yc,yd,ye,yf,kS,yg,kT,yh,yi,yj,yk,yl,yn,kU,yo,yp,yq,yr,ys,yt,yu,yv,yw,yx,yy,yz,yA,yB,yC,kV,yD,yE,yF,yG,yH,yI,yJ,yK,yL,yM,yN,kW,yO,yP,ra,rb,rc,rd,re,rf,rg,rh,ri,rj,rk,rl,rm,rn,ky,ro,rp,rq,rr,rs,rt,ru,rv,rw,rx,ry,rz,rA,rB,rC,kz,rD,rE,rF,rG,rH,rI,kA,rJ,kB,rK,rL,rM,rN,rO,rP,kC,rQ,rR,rS,rT,rU,rV,rW,rX,rY,rZ,s0,s1,s2,s3,s4,kD,s5,s6,s7,s8,s9,sa,sb,sc,sd,se,sf,sg,sh,si,sj,kE,sk,sl,sm,sn,so,sp,sq,sr,ss,st,su,sv,sw,sx,sy,kF,sz,sA,sB,sC,sD,sE,kG,sF,kH,sG,sH,sI,sJ,sK,sL,kI,sM,hF,sN,hG,sO,hH,sP,hI,sQ,sR,sS,sT,sU,sV,sW,kJ,sX,sY,sZ,t0,t1,t2,t3,t4,t5,t6,hF,t7,hG,t8,hH,t9,hI,ta,tb,tc,td,te,tf,tg,th,ti,tj,tk,tl,tm,tn,tp,tq,tr,ts,tt,tu,tv,tw,tx,ty,tz,tA,tB,tC,tD,tE,tF,tG,tH,tI,tJ,tK,tL,tM,tN,tO,tP,tQ,tR,tS,tT,tU,tV,tW,tX,tY,tZ,u1,u2,u3,u4,u5,u6,u7,u8,u9,ua,ub,uc,ud,ue,uf,ug,uh,ui,uj,uk,ul,um,un,uo,up,kh,uq,ur,us,ut,uu,uv,uw,ux,uy,uz,uA,uB,uC,uD,uE,uF,uG,uH,uI,uJ,uK,uL,uM,uN,uO,uP,uQ,uR,uS,uT,uU,uV,uW,uX,uY,uZ,v1,v2,v3,v4,v5,v6,v7,v8,v9,va,vb,vc,vd,ve,vf,vg,vh,vi,vj,vk,vl,vm,vn,vo,vp,vq,vr,vs,vt,vu,vv,vw,vx,vy,vz,vA,vB,vC,vD,vE,vF,vG,vH,vI,vJ,vK,vL,vM,vN,vO,vP,vQ,vR,vS,vT,vU,vV,vW,vX,vY,vZ,w0,w1,w2,w3,w4,w5,w6,w7,w8,w9,wa,wb,wc,wd,wf,wg,wh,wi,wj,wk,wl,wm,wn,wo,wp,wq,wr,ws,wt,wu,wv,ww,wx,wy,wz,wA,wB,wC,wD,wE,wF,wG,wH,wI,wJ,wK,wL,wM,wN,wO,hJ,wP,hK,wQ,hL,wR,hM,wS,wT,wU,wV,wW,wX,wY,wZ,x0,x1,kK,x2,x3,x4,x5,x6,x7,x8,hJ,x9,hK,xa,hL,xb,hM,xc,kL,xd,xe,xf,xg,xh,xi,kM,xj,kN,xk,xl,xn,xo,xp,xq,kO,xr,xs,xt,xu,xv,xw,xx,xy,xz,xA,xB,xC,xD,xE,xF,kP,xG,xH,xI,xJ,xK,xL,xM,xN,xO,xP,xQ,xR,xS,xT,xU,kQ,xV,xW,xX,xY,xZ,y0,y1,y2,y3,y4,y5,y6,y7,y8,y9,kR,ya,yb,yc,yd,ye,yf,kS,yg,kT,yh,yi,yj,yk,yl,yn,kU,yo,yp,yq,yr,ys,yt,yu,yv,yw,yx,yy,yz,yA,yB,yC,kV,yD,yE,yF,yG,yH,yI,yJ,yK,yL,yM,yN,kW,yO,yP,Oo,Op,Oq,Or,Os,Ot,Ou,Ov,Ow,Ox,Oy,Oz,OA,OB,kK,OC,OD,OE,OF,OG,OH,OI,OJ,OL,OM,ON,OO,OP,OQ,OR,kL,OS,OT,OU,OV,OW,OX,kM,OY,kN,OZ,P0,P1,P2,P3,P4,kO,P5,P6,P7,P8,P9,Pa,Pb,Pc,Pd,Pe,Pf,Pg,Ph,Pi,Pj,kP,Pk,Pl,Pm,Pn,Po,Pp,Pq,Pr,Ps,Pt,Pu,Pv,Pw,Px,Py,kQ,Pz,PA,PB,PC,PD,PE,PF,PG,PH,PI,PJ,PK,PL,PM,PN,kR,PO,PP,PQ,PR,PS,PT,kS,PU,kT,PV,PW,PX,PY,PZ,Q0,kU,Q1,yQ,Q2,yR,Q3,yS,Q4,yT,Q5,Q6,Q7,Q8,Q9,Qa,Qb,kV,Qc,Qd,Qe,Qf,Qg,Qh,Qi,Qj,Qk,Ql,yQ,Qm,yR,Qn,yS,Qo,yT,Qp,Qq,Qr,Qs,Qt,Qu,Qv,Qw,Qx,Qy,Qz,QA,QB,QC,QD,QE,QF,QG,QH,QI,QJ,QK,QL,QM,QN,QO,QP,QQ,QR,QS,QT,QU,QV,QW,QX,QY,QZ,R0,R1,R2,R3,R4,R5,R6,R7,R8,R9,Ra,Rb,Rc,Rd,Re,Rf,Rg,Rh,Ri,Rj,Rk,Rl,Rm,Rn,Ro,Rp,Rq,Rr,Rs,Rt,Ru,Rv,Rw,Rx,Ry,Rz,RA,RB,RC,RD,RE,RF,RG,RH,RI,RJ,RK,RL,RM,RN,RO,RP,RQ,RR,RS,RT,RU,RV,RW,RX,RY,RZ,S0,S1,S2,S3,S4,S5,S6,S7,S8,S9,Sa,Sb,Sc,Sd,Se,Sf,Sg,Sh,Si,Sj,Sk,Sl,Sm,Sn,So,Sp,Sq,Sr,Ss,St,Su,Sv,Sw,Sx,Sy,Sz,SA,SB,SC,SE,SF,SG,SH,SI,SJ,SK,SL,SM,SN,SO,SP,SQ,SR,SS,ST,SU,SV,SW,SX,SY,SZ,T0,T1,T2,T3,T4,T5,T6,T7,T8,T9,Ta,Tb,Tc,Td,Te,Tf,Tg,Th,Ti,Tj,Tk,Tl,Tm,Tn,To,Tp,Tq,Tr,Ts,Tt,Tu,Tv,Tw,Tx,Ty,Tz,TA,TB,TC,TD,TE,TF,TG,TH,TI,TJ,TK,TL,TM,TN,TO,TP,TQ,TR,TS,TT,TU,TV,TW,TX,TY,TZ,U0,U1,yU,U2,yV,U3,yW,U4,yX,U5,U6,U7,U8,U9,Ua,Ub,Uc,Ud,Ue,Uf,Ug,Uh,Ui,Uj,Uk,Ul,Um,yU,Un,yV,Uo,yW,Up,yX,Uq,Ur,Us,Ut,Uu,Uv,Uw,Ux,Uy,Uz,UA,UB,UC,UD,UE,UF,UG,UH,UI,UJ,UK,UL,UM,UN,UO,UP,UQ,UR,US,UT,UU,UV,UW,UX,UY,UZ,V0,V1,V2,V3,V4,V5,V6,V7,V8);1e yY(a,b){1b c=cq[a-1][0];1b d=cq[a-1][1];1b e=0;1b i=1h;1g(i=2;c;++i){if(c&1){e+=2J(d&1,b[i])}d>>=1;c>>=1}1f e}1e yZ(a){1b b,ai,5S;1g(b=0;b<6k;++b){1g(ai=0;ai<6l;++ai){1g(5S=0;5S<5E;++5S){1b p=a.2M[b][ai][5S];1b c=a.h1[b][ai][5S];1b d=2J(1,p[1]);1b v;c[0]=2J(0,p[1]);1g(v=1;v<=9i;++v){c[v]=d+yY(v,p)}}}}}1b cs=1c 1d(qa,V9,kX,Va);1b ct=1c 1d(hN,z0,Vb,z0);1b cu=1c 1d(1c 1d(1c 1d(1A,Vc,Vd,Ve,Vf,Vg,z1,Vh,Vi,Vj),1c 1d(pY,Vk,z2,Vl,kY,Vm,Vn,Vo,z3,qy),1c 1d(Vp,Vq,Vr,Vs,kY,Vt,Vu,Vv,Vw,qx),1c 1d(aj,Vx,Vy,Vz,z4,qA,z5,VA,z6,kZ),1c 1d(ga,z7,VB,l0,z8,l1,f4,z9,VC,za),1c 1d(pU,zb,VD,zc,VE,f6,VF,zd,ze,VG),1c 1d(VH,pE,zf,VI,VJ,VK,VL,VM,z3,VN),1c 1d(VO,zg,hO,VP,VQ,VR,f5,VS,qL,qq),1c 1d(hP,hO,VT,zh,zi,zj,VU,VV,VW,zk),1c 1d(VX,VY,zc,hQ,VZ,W0,hC,W1,hC,W2)),1c 1d(1c 1d(W3,zl,l2,W4,zm,qt,W5,W6,W7,W8),1c 1d(W9,Wa,Wb,Wc,hE,zn,Wd,We,Wf,Wg),1c 1d(l3,pO,Wh,Wi,qI,zo,qv,f7,kx,kx),1c 1d(f6,pJ,l4,Wj,qB,qF,zp,Wk,zq,zr),1c 1d(Wl,Wm,zg,Wn,Wo,l5,Wp,zs,Wq,Wr),1c 1d(hR,l6,hR,zt,l7,hQ,Ws,zu,f8,f8),1c 1d(zv,Wt,Wu,Wv,z9,Ww,Wx,qz,Wy,Wz),1c 1d(zw,WA,zx,zy,WB,l8,zz,WC,WD,zA),1c 1d(hS,zB,WE,WF,WG,WH,WI,zC,WJ,l9),1c 1d(l3,zh,zD,WK,zE,zF,zj,zG,WL,zH)),1c 1d(1c 1d(la,WM,zH,zI,WN,WO,WP,za,WQ,qW),1c 1d(zJ,zK,pQ,WR,WS,WT,WU,WV,qT,WW),1c 1d(hB,hT,WX,WY,WZ,X0,zL,f7,qS,X1),1c 1d(aj,zM,zN,X2,X3,X4,X5,X6,zO,X7),1c 1d(hB,zP,X8,zQ,zR,X9,zS,Xa,zL,kt),1c 1d(hy,lb,Xb,zT,Xc,zU,kv,kl,zV,Xd),1c 1d(pS,Xe,zW,Xf,r3,Xg,6H,Xh,l4,zJ),1c 1d(zX,l9,Xi,Xj,Xk,Xl,Xm,Xn,Xo,zY),1c 1d(hy,Xp,Xq,zZ,lc,zE,Xr,A0,zN,Xs),1c 1d(ld,Xt,Xu,Xv,Xw,Xx,hO,Xy,A1,Xz)),1c 1d(1c 1d(q8,XA,qs,A2,A3,XB,XC,XD,qG,kv),1c 1d(XE,le,A4,hU,XF,XG,XH,XI,XJ,A5),1c 1d(le,XK,lf,l0,XL,XM,zG,ks,XN,qm),1c 1d(hU,lg,qP,XO,zz,XP,XQ,XR,XS,qk),1c 1d(la,m4,XT,pI,zQ,XU,zo,A6,XV,XW),1c 1d(XX,A7,zq,XY,XZ,Y0,Y1,Y2,Y3,f5),1c 1d(Y4,Y5,zf,Y6,Y7,A8,kZ,A9,Aa,pH),1c 1d(Y8,hy,Y9,Ya,Ab,Ab,A8,Yb,Yc,zF),1c 1d(f6,Ac,zd,m3,Yd,Ad,Ae,Ye,zl,Yf),1c 1d(Af,Ag,lh,zK,zO,Ah,Yg,Yh,Yi,Yj)),1c 1d(1c 1d(kX,zS,z7,Yk,zi,f7,Yl,zs,Ai,Ym),1c 1d(li,Yn,Yo,lj,Yp,Aj,qD,Yq,Yr,Ak),1c 1d(hP,Ys,Yt,Yu,Yv,kr,Yw,Yx,Yy,Yz),1c 1d(hU,zB,YA,YB,Al,YC,YD,YE,YF,YG),1c 1d(hS,Am,kt,An,pR,Ao,A1,Ap,lf,l7),1c 1d(YH,l1,YI,Aq,Ar,YJ,Aq,YK,As,A5),1c 1d(lk,YL,l1,YM,YN,A9,YO,YP,Ao,hz),1c 1d(hR,YQ,YR,At,Au,Au,YS,YT,YU,zC),1c 1d(hU,YV,A6,Av,Aw,YW,qo,YX,ll,Ax),1c 1d(zw,kp,YY,YZ,Z0,Ay,l5,Z1,Z2,Z3)),1c 1d(1c 1d(zv,Z4,Z5,Z6,qh,pM,Z7,lm,Z8,qX),1c 1d(hP,li,Ac,Z9,Za,Zb,Ae,Zc,z1,ql),1c 1d(Zd,Ze,zU,A3,Zf,Zg,Zh,Zi,At,qU),1c 1d(Zj,Zk,lj,Zl,Zm,lb,Ad,zk,Zn,ln),1c 1d(hB,zA,f6,Az,Zo,hR,Zp,Zq,l0,Zr),1c 1d(ln,AA,Zs,qR,ku,Zt,r2,Zu,Zv,zp),1c 1d(hN,ko,Zw,Zx,AB,Zy,Zz,AB,AC,6H),1c 1d(la,ZA,lj,ZB,f5,ZC,ZD,ZE,Ak,ZF),1c 1d(aj,hx,kZ,AD,ZG,ZH,lo,AE,ZI,ZJ),1c 1d(ZK,ZL,ZM,hx,ZN,z6,ZO,f8,AF,Ay)),1c 1d(1c 1d(pV,ZP,AG,ZQ,Ah,ku,ZR,AH,ZS,zY),1c 1d(ZT,ZU,lp,ZV,lq,ZW,zr,l2,zn,ZX),1c 1d(hN,ZY,ZZ,10a,AI,AI,AD,10b,10c,AJ),1c 1d(lk,AK,10d,10e,10f,10g,zM,10h,lo,10i),1c 1d(10j,l6,A4,l9,AL,hT,10k,10l,10m,Aw),1c 1d(f6,AM,10n,10o,zP,10p,10q,10r,10s,10t),1c 1d(10u,l2,10v,10w,qE,r5,10x,AN,10y,AO),1c 1d(hV,f7,10z,zV,kw,kw,hS,10A,10B,10C),1c 1d(lk,ks,AP,As,zx,AQ,AR,hD,Az,li),1c 1d(10D,AS,10E,10F,AT,AT,10G,10H,AP,pN)),1c 1d(1c 1d(hV,hQ,10I,10J,10K,10L,10M,10N,qM,10O),1c 1d(10P,10Q,10R,AU,10S,lm,10T,10U,10V,10W),1c 1d(zX,pF,10X,10Y,10Z,f8,11a,11b,kY,11c),1c 1d(ld,11d,zu,lc,11e,zb,lc,lp,11f,11g),1c 1d(zZ,11h,Al,pG,11i,11j,kn,11k,11l,AV),1c 1d(hP,11m,l3,qp,qi,11n,zy,11o,qC,l8),1c 1d(hN,kl,l4,11p,11q,11r,pT,11s,11t,11u),1c 1d(AW,qu,Av,11v,11w,11x,11y,11z,11A,11B),1c 1d(aj,11C,Am,A7,zR,11D,11E,11F,AX,AX),1c 1d(11G,Ax,zW,11H,lm,lb,11I,hS,f8,Ar)),1c 1d(1c 1d(11J,f7,11K,AF,11L,11M,zm,11N,11O,z5),1c 1d(Af,11P,11Q,11R,zt,11S,11T,qV,11U,zD),1c 1d(AW,11V,lg,lr,kn,11W,11X,4k,lq,lq),1c 1d(11Y,qj,11Z,pP,12a,12b,12c,12d,12e,12f),1c 1d(hT,AG,12g,AY,Ag,12h,f4,12i,12j,kp),1c 1d(aj,hx,12k,12l,12m,lr,12n,12o,12p,12q),1c 1d(12r,qn,AM,12s,12t,r4,lr,lo,12u,ld),1c 1d(ll,12v,12w,A2,AZ,AZ,AA,12x,Aa,zT),1c 1d(l5,z4,hD,A0,AY,12y,qJ,hE,12z,12A),1c 1d(lg,lf,12B,12C,lp,lh,ze,12D,B0,B0)),1c 1d(1c 1d(12E,12F,12G,B1,12H,12I,12J,hE,12K,12L),1c 1d(ll,12M,AH,12N,qO,12O,12P,12Q,AU,12R),1c 1d(hV,hT,pK,AK,12S,12T,lh,l8,12U,zI),1c 1d(aj,12V,B1,12W,qH,12X,hD,12Y,l7,12Z),1c 1d(13a,13b,AE,13c,hQ,13d,qr,13e,AO,13f),1c 1d(hV,Aj,13g,13h,AJ,13i,z2,AN,AL,AV),1c 1d(pX,13j,m5,AQ,13k,13l,l6,13m,13n,13o),1c 1d(kX,13p,qg,hO,13q,13r,An,13s,qK,Ap),1c 1d(ln,13t,13u,z8,kr,AR,AC,13v,13w,13x),1c 1d(le,AS,f5,ko,B2,B2,Ai,qQ,13y,13z)));1b cv={6B:1h,5b:1h,8v:4q,13A:0,B3:1h,6G:1n(bJ),3Z:1n(bK),5x:1n(bL)};1b cw=1c 1d(0,1,2,3,6,4,5,6,6,6,6,6,6,6,6,7,0);1b cx=1c 1d(5A,148,140);1b cy=1c 1d(4B,3e,140,135);1b cz=1c 1d(6w,4v,141,134,130);1b cA=1c 1d(1j,1j,2E,5K,3L,6h,9H,140,133,130,129);1e ls(a,b){1b c=a.1X;if(b)yZ(c);c.h2=0}1e B4(a,b){1f 1t(b?(b-a)*1a/b:1a)}1e B5(a){1b b=a.1X;1b c=a.1S*a.2Z;1b d=b.h2;1b e=1h;b.9j=B4(d,c);b.5m=(b.9j<2r)+0;e=1I;if(b.5m){e+=d*2J(1,b.9j)+(c-d)*2J(0,b.9j);e+=8*1I}1f e}1e B6(a){1b b=a.1X;b.3Z=1n(bK)}1e ak(a,b){b[0]+=1t(a+0);b[1]+=1;1f a}1e hW(a,b){1b n=b.6B;1b s=b.3Z[cw[n]][a];if(!ak(b.5b>=0,s[0])){1f 0}1s(1){1b v=b.8v[n++];if(!ak(v!=0,s[1])){s=b.3Z[cw[n]][0];4n}if(!ak(2<(v+1),s[2])){s=b.3Z[cw[n]][1]}1k{v=4c.5T(v);if(v>9i)v=9i;{1b c=cq[v-1][1];1b d=cq[v-1][0];1b i;1g(i=0;(d>>=1)!=0;++i){1b e=2<<i;if(d&1)ak(!!(c&e),s[3+i])}}s=b.3Z[cw[n]][2]}if(n==16||!ak(n<=b.5b,s[0])){1f 1}}}1e B7(a,b){1f a?1t(((b-a)*1a+b/2)/b):1a}1e B8(a){1b d=a.1X;1b e=0;1b t,b,c,p;1g(t=0;t<6k;++t){1g(b=0;b<6l;++b){1g(c=0;c<5E;++c){1g(p=0;p<6U;++p){1b f=d.k0[t][b][c][p];1b g=dz[t][b][c][p];1b h=dw[t][b][c][p];1b i=B7(f[0],f[1]);1b j=kk(f[0],f[1],h)+2J(0,g);1b k=kk(f[0],f[1],i)+2J(1,g)+8*1I;1b l=(j>k)+0;e+=2J(l,g);if(l){d.2M[t][b][c][p]=i;e+=8*1I}1k{d.2M[t][b][c][p]=h}}}}}1f e}1e 5c(a,b,c,d){d.B3=b;d.6G=c.1X.2M[b];d.3Z=c.1X.k0[b];d.5x=c.1X.h1[b];d.6B=a}1e 5U(a,b){1b n;b.5b=-1;1g(n=15;n>=b.6B;--n){if(a[n]){b.5b=n;1Q}}b.8v=a}1e f9(a,b){1b n=b.6B;1b p=b.6G[cw[n]][a];1b t=b.5x[cw[n]][a];1b c=1h;c=2J(b.5b>=0,p[0]);if(b.5b<0){1f c}1s(n<=b.5b){1b v=b.8v[n++];if(v==0){p=b.6G[cw[n]][0];t=b.5x[cw[n]][0];4n}1k if(2>=(v+1)){c+=hw(t,1);p=b.6G[cw[n]][1];t=b.5x[cw[n]][1]}1k{c+=hw(t,4c.5T(v));p=b.6G[cw[n]][2];t=b.5x[cw[n]][2]}if(n<16){c+=2J(n<=b.5b,p[0])}}1f c}1b cB=1n(cv);1e B9(a,b){1b x=(a.1V&3)+0,y=(a.1V>>2)+0;1b c=(cB);1b R=0;1b d=1h;5c(0,3,a.1x,c);d=a.1C[x]+a.1E[y];5U(b,c);R+=f9(d,c);1f R}1b cC=1n(cv);1e Ba(a,b){1b c=(cC);1b x,y=1h;1b R=0;9q(a);5c(0,1,a.1x,c);5U(b.8q,c);R+=f9(a.1C[8]+a.1E[8],c);5c(1,0,a.1x,c);1g(y=0;y<4;++y){1g(x=0;x<4;++x){1b d=a.1C[x]+a.1E[y];5U(b.4H[x+y*4],c);R+=f9(d,c);a.1C[x]=a.1E[y]=(c.5b>=0)+0}}1f R}1b cD=1n(cv);1e Bb(a,b){1b c=(cD);1b d,x,y;1b R=0;9q(a);5c(0,2,a.1x,c);1g(d=0;d<=2;d+=2){1g(y=0;y<2;++y){1g(x=0;x<2;++x){1b e=a.1C[4+d+x]+a.1E[4+d+y];5U(b.7v[d*2+x+y*2],c);R+=f9(e,c);a.1C[4+d+x]=a.1E[4+d+y]=(c.5b>=0)+0}}}1f R}1e hX(a,b,d){1b n=d.6B;1b p=d.6G[cw[n]][b];if(!1D(a,d.5b>=0,p[0])){1f 0}1s(n<16){1b c=d.8v[n++];1b e=(c<0)+0;1b v=e?-c:c;if(!1D(a,v!=0,p[1])){p=d.6G[cw[n]][0];4n}if(!1D(a,v>1,p[2])){p=d.6G[cw[n]][1]}1k{if(!1D(a,v>4,p[3])){if(1D(a,v!=2,p[4]))1D(a,v==4,p[5])}1k if(!1D(a,v>10,p[6])){if(!1D(a,v>6,p[7])){1D(a,v==6,3I)}1k{1D(a,v>=9,4P);1D(a,!(v&1),145)}}1k{1b f=1h;1b g;1b h=0;if(v<3+(8<<1)){1D(a,0,p[8]);1D(a,0,p[9]);v-=3+(8<<0);f=1<<2;g=cx;h=0}1k if(v<3+(8<<2)){1D(a,0,p[8]);1D(a,1,p[9]);v-=3+(8<<1);f=1<<3;g=cy;h=0}1k if(v<3+(8<<3)){1D(a,1,p[8]);1D(a,0,p[10]);v-=3+(8<<2);f=1<<4;g=cz;h=0}1k{1D(a,1,p[8]);1D(a,1,p[10]);v-=3+(8<<3);f=1<<10;g=cA;h=0}1s(f){1D(a,!!(v&f),g[h++]);f>>=1}}p=d.6G[cw[n]][2]}4a(a,e);if(n==16||!1D(a,n<=d.5b,p[0])){1f 1}}1f 1}1b cE=1n(cv);1e Bc(a,b,c){1b x,y,ch;1b d=(cE);1b e=3b,8t=3b,ag=3b;1b f=(b.2B[b.2u].4Y==1)+0;1b g=b.2B[b.2u].1Z;9q(b);e=9g(a);if(f){5c(0,1,b.1x,d);5U(c.8q,d);b.1C[8]=b.1E[8]=hX(a,b.1C[8]+b.1E[8],d);5c(1,0,b.1x,d)}1k{5c(0,3,b.1x,d)}1g(y=0;y<4;++y){1g(x=0;x<4;++x){1b h=b.1C[x]+b.1E[y];5U(c.4H[x+y*4],d);b.1C[x]=b.1E[y]=hX(a,h,d)}}8t=9g(a);5c(0,2,b.1x,d);1g(ch=0;ch<=2;ch+=2){1g(y=0;y<2;++y){1g(x=0;x<2;++x){1b h=b.1C[4+ch+x]+b.1E[4+ch+y];5U(c.7v[ch*2+x+y*2],d);b.1C[4+ch+x]=b.1E[4+ch+y]=hX(a,h,d)}}}ag=9g(a);b.hj=8t-e;b.hk=ag-8t;b.f3[g][f]+=b.hj;b.f3[g][2]+=b.hk;lt(b)}1b cF=1n(cv);1e Bd(a,b){1b x,y,ch;1b c=(cF);9q(a);if(a.2B[a.2u].4Y==1){5c(0,1,a.1x,c);5U(b.8q,c);a.1C[8]=a.1E[8]=hW(a.1C[8]+a.1E[8],c);5c(1,0,a.1x,c)}1k{5c(0,3,a.1x,c)}1g(y=0;y<4;++y){1g(x=0;x<4;++x){1b d=a.1C[x]+a.1E[y];5U(b.4H[x+y*4],c);a.1C[x]=a.1E[y]=hW(d,c)}}5c(0,2,a.1x,c);1g(ch=0;ch<=2;ch+=2){1g(y=0;y<2;++y){1g(x=0;x<2;++x){1b d=a.1C[4+ch+x]+a.1E[4+ch+y];5U(b.7v[ch*2+x+y*2],c);a.1C[4+ch+x]=a.1E[4+ch+y]=hW(d,c)}}}lt(a)}1e Be(a){2R(a.9o,0,0,1F(a.9o)*3);a.he=0}1e Bf(a){1b b=a.1x;1b c=a.2T;1b d=a.3q;1b e=a.3j;1b f=a.3O;b.9o[0]+=dM(c,d+bk,e,f+bk);b.9o[1]+=dN(c,d+bl,e,f+bl);b.9o[2]+=dN(c,d+bm,e,f+bm);b.he+=16*16}1e Bg(a){1b c=a.1x;1b d=a.2B[a.2u];1b e=c.2I;if(e.aa){Bf(a);c.f0[0]+=(d.4Y==0)+0;c.f0[1]+=(d.4Y==1)+0;c.f0[2]+=(d.4x!=0)+0}if(e.5u){fH(e.9f){3l 1:e.5u[a.2P+a.3r*c.1S]=d.4Y;1Q;3l 2:e.5u[a.2P+a.3r*c.1S]=d.1Z;1Q;3l 3:e.5u[a.2P+a.3r*c.1S]=c.1T[d.1Z].5P;1Q;3l 4:e.5u[a.2P+a.3r*c.1S]=(d.4Y==1)?a.3N[a.3B+0]:1v;1Q;3l 5:e.5u[a.2P+a.3r*c.1S]=d.e8;1Q;3l 6:{1b b=1t((a.hj+a.hk+7)>>3);e.5u[a.2P+a.3r*c.1S]=(b>1a)?1a:b;1Q}fI:13B=0;1Q}}}1e Bh(a){if(a.2B[a.2u].4Y==1){a.2g[a.4F]=0;a.1E[8]=0}1k{a.2g[a.4F]&=(1<<24)}}1e Bi(a){1b i,s,p;1b b=1n(bV);1b c=1n(bU);1b d=(!a.1X.5m)+0;1b e=a.kc;1b f=5;1b g=1t(a.1S*a.2Z*f/a.3h);1g(p=0;p<a.3h;++p){hl(a.2i[+p],g)}ls(a,(e!=0));Be(a);fm(a,b);pz(b);do{hY(b);if(!lu(b,c,e)||(!a.1X.5m)){Bc(b.7r,b,c)}1k{Bh(b)}if(a.9m){pa(b)}if(a.9n){pe(b)}Bg(b);pA(b);Bj(b)}1s(fn(b,b.3j,b.3O));pB(b);1g(p=0;p<a.3h;++p){hm(a.2i[+p])}if(a.2I.aa){1g(i=0;i<=2;++i){1g(s=0;s<be;++s){a.kb[i][s]=1t((b.f3[s][i]+7)>>3)}}}1f 1}1b cG=(15+20+10);1e lv(a,q,b,c,d){1b e=1n(bV);1b f=0;1b g=0;1b h=c*c8;if(q<0.){q=0}1k if(q>100.){q=100}Bk(a,q);ls(a,b!=0);B6(a);fm(a,e);1b i=1n(bU);do{1b j=(i);hY(e);if(lu(e,j,b)){a.1X.h2++}Bd(e,j);f+=j.R;g+=j.D}1s(fn(e,e.3j,e.3O)&&--c>0);f+=B5(a);f+=B8(a);f+=a.2Y.e6;f=((f+6H)>>11)+cG;if(d){d.f=al(10.*(4c.Bl*4c.Bm(1a.*1a.*h/g)))}1f 1t(f)}1b cH=1c 1d(20,15,10,8,6,4,2,1,0);1e Bn(a){1b b=(a.2t.8f>0||a.2t.7k>0)+0;1b c=(a.5Q<2&&!b)+0;1b q=al(a.2t.8e);1b d=1h;1b e=1h;e=a.1S*a.2Z;if(c&&e>100)e=100;if(!b){1g(d=0;d<a.2t.7n;++d){1b f=(a.5Q>2)+0;lv(a,q,f,e,1i)}1f 1}1g(d=0;d<a.2t.7n&&(cH[d]>0);++d){1b f=1;1b g={f:aE};1b h=1h;1b i=lv(a,q,f,e,g);if(a.2t.7k>0){h=(g.f<a.2t.7k)}1k{h=(i<a.2t.8f)}if(h){q+=cH[d]}1k{q-=cH[d]}}1f 1}1e lw(a){1b b=a.1x;b.7t[b.7u-1]=b.8o[b.8p-1]=b.ae[b.af-1]=(a.3r)>0?129:127;2R(b.7t,b.7u+0,129,16);2R(b.8o,b.8p+0,129,8);2R(b.ae,b.af+0,129,8);a.1E[8]=0}1e Bo(a){1b b=a.1x;1b c=b.1S*16;2R(b.7s,0,127,2*c);2R(b.2g,b.4F+0,0,b.1S*1F(b.2g))}1e Bp(a){1b b=a.1x;a.2P=0;a.3r=0;a.p4=0;a.p5=0;a.2B=b.3y;a.2u=b.p3;a.3N=b.3N;a.3B=b.3B;a.2g=b.2g;a.4F=b.4F;a.7r=b.2i[0];a.kd=b.1S*b.2Z;Bo(a);lw(a);a.f3=3m(1d(4,3),0);a.8s=0}1e fm(a,b){b.1x=a;b.p6=a.2I.2d;b.p7=a.2I.2j;b.2T=a.2T;b.3j=a.3j;b.4G=a.4G;b.4l=a.4l;b.4Z=a.4Z;Bp(b)}1e hY(a){1b b=a.1x;1b x=a.2P,y=a.3r;1b c=b.2I;1b d=c.y;1b e=c.2v+(y*c.2d+x)*16;1b f=c.u;1b g=c.2s+(y*c.2j+x)*8;1b j=c.v;1b k=c.2w+(y*c.2j+x)*8;1b l=a.2T;1b m=a.3q+bk;1b n=a.2T;1b o=a.3q+bl;1b p=a.2T;1b q=a.3q+bm;1b w=(c.1z-x*16);1b h=(c.1B-y*16);1b i;if(w>16)w=16;if(h>16)h=16;1g(i=0;i<h;++i){1u(l,m,d,e,w);if(w<16)2R(l,m+w,l[m+w-1],16-w);m+=bf;e+=c.2d}1g(i=h;i<16;++i){1u(l,m,l,m-bf,16);m+=bf}w=1t((w+1)/2);h=1t((h+1)/2);1g(i=0;i<h;++i){1u(n,o,f,g,w);1u(p,q,j,k,w);if(w<8){2R(n,o+w,n[o+w-1],8-w);2R(p,q+w,p[q+w-1],8-w)}o+=bf;q+=bf;g+=c.2j;k+=c.2j}1g(i=h;i<8;++i){1u(n,o,n,o-bf,8);1u(p,q,p,q-bf,8);o+=bf;q+=bf}}1e Bj(a){1b b=a.1x;if(b.2t.8h){1b x=a.2P,y=a.3r;1b c=a.3j;1b d=a.3O+bk;1b e=a.3j;1b f=a.3O+bl;1b g=a.3j;1b j=a.3O+bm;1b k=b.2I;1b l=k.y;1b m=k.2v+(y*k.2d+x)*16;1b n=k.u;1b o=k.2s+(y*k.2j+x)*8;1b p=k.v;1b q=k.2w+(y*k.2j+x)*8;1b w=(k.1z-x*16);1b h=(k.1B-y*16);1b i;if(w>16)w=16;if(h>16)h=16;1g(i=0;i<h;++i){1u(l,m+i*k.2d,c,d+i*bf,w)}{1b r=1t((w+1)/2);1b s=1t((h+1)/2);1g(i=0;i<s;++i){1u(n,o+i*k.2j,e,f+i*bf,r);1u(p,q+i*k.2j,g,j+i*bf,r)}}}}1e 3C(a,n){1f(!!((a)&(1<<(n))))+0}1e 9q(a){1b b=a.2g[a.4F+0],3z=a.2g[a.4F-1];a.1C[0]=3C(b,12);a.1C[1]=3C(b,13);a.1C[2]=3C(b,14);a.1C[3]=3C(b,15);a.1C[4]=3C(b,18);a.1C[5]=3C(b,19);a.1C[6]=3C(b,22);a.1C[7]=3C(b,23);a.1C[8]=3C(b,24);a.1E[0]=3C(3z,3);a.1E[1]=3C(3z,7);a.1E[2]=3C(3z,11);a.1E[3]=3C(3z,15);a.1E[4]=3C(3z,17);a.1E[5]=3C(3z,19);a.1E[6]=3C(3z,21);a.1E[7]=3C(3z,23)}1e lt(a){1b b=0;b|=(a.1C[0]<<12)|(a.1C[1]<<13);b|=(a.1C[2]<<14)|(a.1C[3]<<15);b|=(a.1C[4]<<18)|(a.1C[5]<<19);b|=(a.1C[6]<<22)|(a.1C[7]<<23);b|=(a.1C[8]<<24);b|=(a.1E[0]<<3)|(a.1E[1]<<7);b|=(a.1E[2]<<11);b|=(a.1E[4]<<17)|(a.1E[6]<<21);a.2g[a.4F]=b}1e fn(a,b,c){1b d=a.1x;if(b){1b x=a.2P,y=a.3r;1b e=b;1b f=c+bk;1b g=b;1b h=c+bl;if(x<d.1S-1){1b i;1g(i=0;i<16;++i){d.7t[d.7u+i]=e[f+15+i*bf]}1g(i=0;i<8;++i){d.8o[d.8p+i]=g[h+7+i*bf];d.ae[d.af+i]=g[h+15+i*bf]}d.7t[d.7u-1]=d.7s[d.8n+x*16+15];d.8o[d.8p-1]=d.9p[d.ad+x*16+0+7];d.ae[d.af-1]=d.9p[d.ad+x*16+8+7]}if(y<d.2Z-1){1u(d.7s,d.8n+x*16,e,f+15*bf,16);1u(d.9p,d.ad+x*16,g,h+7*bf,8+8)}}a.2u++;a.3B+=4;a.4F++;a.2P++;if(a.2P==d.1S){a.2P=0;a.3r++;a.7r=d.2i[a.3r&(d.3h-1)];a.3N=d.3N;a.3B=d.3B+a.3r*4*d.5v;a.2g=d.2g;a.4F=d.4F;lw(a)}1f(0<--a.kd)}1e hZ(a,b){1b y;1b c=a.3N;1b d=a.3B;1g(y=0;y<4;++y){2R(c,d,b,4);d+=a.1x.5v}a.2B[a.2u].4Y=1}1e lx(a,b){1b x,y;1b c=a.3N;1b d=a.3B;1g(y=0;y<4;++y){1g(x=0;x<4;++x){c[d+x]=b[x+y*4]}d+=a.1x.5v}a.2B[a.2u].4Y=0}1e ly(a,b){a.2B[a.2u].e8=b}1e lz(a,b){a.2B[a.2u].4x=b}1e Bq(a,b){a.2B[a.2u].1Z=b}1b cI=1c 1d(17,21,25,29,13,17,21,25,9,13,17,21,5,9,13,17);1e i0(a){1b b=a.1x;1b i;a.1V=0;a.f1=a.8r;a.f2=+cI[0];1g(i=0;i<17;++i){a.8r[i]=b.7t[b.7u+15-i]}1g(i=0;i<16;++i){a.8r[17+i]=b.7s[b.8n+a.2P*16+i]}if(a.2P<b.1S-1){1g(i=16;i<16+4;++i){a.8r[17+i]=b.7s[b.8n+a.2P*16+i]}}1k{1g(i=16;i<16+4;++i){a.8r[17+i]=a.8r[17+15]}}9q(a)}1e i1(a,b,c){1b d=b;1b e=c+di[a.1V];1b f=a.f1;1b g=a.f2;1b i;1g(i=0;i<=3;++i){f[g-4+i]=d[e+i+3*bf]}if((a.1V&3)!=3){1g(i=0;i<=2;++i){f[g+i]=d[e+3+(2-i)*bf]}}1k{1g(i=0;i<=3;++i){f[g+i]=f[g+i+4]}}a.1V++;if(a.1V==16){1f 0}a.f1=a.8r;a.f2=+cI[a.1V];1f 1}1b bc=64;1b cJ=6;1e i2(a){1f a<0?0:a>1a?1a:a}1e Br(a){1b n,x,y=1h;1b b=0;1b w=a.1S;1b h=a.2Z;1b c=5;1b d=4f(w*h*1F(1m),1m);1b e=a.3y;if(d==1i)1f;1g(y=1;y<h-1;++y){1g(x=1;x<w-1;++x){1b f=1p(be,0);b=(x+w*y);1b g=e[b].1Z;f[e[b-w-1].1Z]++;f[e[b-w+0].1Z]++;f[e[b-w+1].1Z]++;f[e[b-1].1Z]++;f[e[b+1].1Z]++;f[e[b+w-1].1Z]++;f[e[b+w+0].1Z]++;f[e[b+w+1].1Z]++;1g(n=0;n<be;++n){if(f[n]>=c){e[b].1Z=n}}d[x+y*w]=g}}1g(y=1;y<h-1;++y){1g(x=1;x<w-1;++x){1b e=a.3y[x+w*y];e.1Z=d[x+y*w]}}d=\'\'}1e i3(a,b){1b c=1h;1b d=a+b;if(d==0)1f 1a;c=1t((1a*a+d/2)/d);1f c}1e Bs(a){1b p=1p(be,0);1b n=1h;1g(n=0;n<a.1S*a.2Z;++n){1b b=a.3y[n];p[b.1Z]++}if(a.2I.aa){1g(n=0;n<be;++n){a.2I.3Z.jL[n]=p[n]}}if(a.2Y.8k>1){1b c=a.1X.4w;c[0]=i3(p[0]+p[1],p[2]+p[3]);c[1]=i3(p[0],p[1]);c[2]=i3(p[2],p[3]);a.2Y.4Q=(c[0]!=1a)||(c[1]!=1a)||(c[2]!=1a)+0;a.2Y.e6=p[0]*(2J(0,c[0])+2J(0,c[1]))+p[1]*(2J(0,c[0])+2J(1,c[1]))+p[2]*(2J(1,c[0])+2J(0,c[2]))+p[3]*(2J(1,c[0])+2J(1,c[2]))}1k{a.2Y.4Q=0;a.2Y.e6=0}}1e 2N(v,m,M){1f v<m?m:v>M?M:v}1e Bt(a,b,c){1b d=a.2Y.8k;1b e=b[0],8w=b[0];1b n=1h;if(d>1){1g(n=0;n<d;++n){if(e>b[n])e=b[n];if(8w<b[n])8w=b[n]}}if(8w==e)8w=e+1;1y(c<=8w&&c>=e);1g(n=0;n<d;++n){1b f=1t(1a*(b[n]-c)/(8w-e));1b g=1t(1a*(b[n]-e)/(8w-e));a.1T[n].9k=2N(f,-127,127);a.1T[n].k3=2N(g,0,1a)}}1e Bu(b,c){1b d=b.2Y.8k;1b e=1p(be,1h);1b f=1h;1b g=1p(1I,1h);1b a,n,k;1b h=0,i4=1a,lA=1h;1b i=1p(be,1h),i5=1p(be,1h);1g(n=0;n<1I&&c[n]==0;++n){}h=n;1g(n=1a;n>h&&c[n]==0;--n){}i4=n;lA=i4-h;1g(n=1,k=0;n<2*d;n+=2){e[k++]=1t(h+(n*lA)/(2*d))}1g(k=0;k<cJ;++k){1b j=1h;1b l=1h;1g(n=0;n<d;++n){i[n]=0;i5[n]=0}1b n=0;1g(a=h;a<=i4;++a){if(c[a]){1s(n<d-1&&4c.5T(a-e[n+1])<4c.5T(a-e[n])){n++}g[a]=n;i5[n]+=a*c[a];i[n]+=c[a]}}l=0;f=0;j=0;1g(n=0;n<d;++n){if(i[n]){1b m=1t((i5[n]+i[n]/2)/i[n]);l+=4c.5T(e[n]-m);e[n]=m;f+=m*i[n];j+=i[n]}}f=1t((f+j/2)/j);if(l<5)1Q}1g(n=0;n<b.1S*b.2Z;++n){1b o=b.3y[n];1b a=o.9k;o.1Z=g[a];o.9k=e[g[a]]}if(d>1){1b p=(b.2t.8i&1);if(p)Br(b)}Bs(b);Bt(b,e,f)}1b cK=2;1b cL=2;1b cM=2;1e Bv(a){1b b=(a.1x.5Q>=3)?cK:4;1b c;1b d=-1;1b e=0;lB(a);1g(c=0;c<b;++c){1b f=dE(a.2T,a.3q+bk,a.4l,a.5w+df[c],0,16);if(f>d){d=f;e=c}}hZ(a,e);1f d}1e Bw(a,b){1b c=1p(16,1h);1b d=(a.1x.5Q>=3)?cL:b2;1b e=0;i0(a);do{1b f;1b g=-1;1b h=a.2T;1b i=a.3q+bk+di[a.1V];i6(a);1g(f=0;f<d;++f){1b j=dE(h,i,a.4l,a.5w+dh[f],0,1);if(j>g){g=j;c[a.1V]=f}}e+=g}1s(i1(a,a.2T,a.3q+bk));if(e>b){lx(a,c);b=i2(e)}1f b}1e Bx(a){1b b=-1;1b c=0;1b d=(a.1x.5Q>=3)?cM:4;1b e;lC(a);1g(e=0;e<d;++e){1b f=dE(a.2T,a.3q+bl,a.4l,a.5w+dg[e],16,16+4+4);if(f>b){b=f;c=e}}ly(a,c);1f b}1e By(a,b,c){1b d=a.1x;1b e,i7=1h;hZ(a,0);lz(a,0);Bq(a,0);e=Bv(a);if(d.5Q!=3){e=Bw(a,e)}i7=Bx(a);e=1t((e+i7+1)/2);b[e]++;c+=i7;a.2B[a.2u].9k=e;1f c}1e Bz(a){1b b=1p(1I,0);1b c=1n(bV);fm(a,c);a.8m=0;do{hY(c);a.8m=By(c,b,a.8m)}1s(fn(c,c.2T,c.3q));a.8m/=a.1S*a.2Z;a.8m=1t(a.8m);Bu(a,b);1f 1}1b cN=1;1b cO=1;1b cP=0;1b cQ=1;1b cR=64;1b cS=30;1b cT=100;1b cU=0.9;1e lD(a,b){1f(((a)*(b)+128)>>8)}1e 2N(v,m,M){1f v<m?m:v>M?M:v}1b cV=1c 1d(0,1,4,8,5,2,3,6,9,12,13,10,7,11,14,15);1b cW=1c 1d(4,5,6,7,8,9,10,10,11,12,13,14,15,16,17,17,18,19,20,20,21,21,22,22,23,23,24,25,25,26,27,28,29,30,31,32,33,34,35,36,37,37,38,39,40,41,42,43,44,45,46,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,76,77,78,79,80,81,82,83,84,85,86,87,88,89,91,93,95,96,98,100,101,102,104,106,108,110,112,114,116,118,122,124,126,128,130,132,134,136,138,140,143,145,148,4M,3o,4v);1b cX=1c 1d(4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,60,62,64,66,68,70,72,74,76,78,80,82,84,86,88,90,92,94,96,98,100,102,104,106,108,110,112,114,116,119,122,125,128,131,134,137,140,143,146,149,4S,3e,c9,6S,8U,4h,3K,5A,6h,5B,6i,5C,3P,5j,3J,1P,2F,2l,5D,2G,3R,9J,2A,3d,3n,2n,1j,nv,nw,nx,gu,iv,ny);1b cY=1c 1d(8,8,9,10,12,13,15,17,18,20,21,23,24,26,27,29,31,32,34,35,37,38,40,41,43,44,46,48,49,51,52,54,55,57,58,60,62,63,65,66,68,69,71,72,74,75,77,79,80,82,83,85,86,88,89,93,96,99,102,105,108,111,114,117,120,124,127,130,133,136,139,142,145,148,4M,3e,c9,6S,8U,4h,3K,5A,4B,3Q,5J,5C,3P,4A,5i,4L,8Y,5D,2G,4U,5K,4O,3V,7g,2n,1j,8z,13C,qc,gu,iw,ix,13D,qb,q9,13E,13F,q7,q6,q5,kq,13G,13H,q4,pZ,13I,m2,13J,13K,13L,13M,pW,qf,13N);1b cZ=1c 1d(0,10,20,30,10,20,30,30,20,30,30,30,30,30,30,30);1b da=1c 1d(1c 1d(96,96,96,96,96,96,96,96,96,96,96,96,96,96,96,96),1c 1d(96,96,96,96,96,96,96,96,96,96,96,96,96,96,96,96),1c 1d(96,96,96,96,96,96,96,96,96,96,96,96,96,96,96,96));1b db=1c 1d(0,30,60,90,30,60,90,90,60,90,90,90,90,90,90,90);1e i9(m,a){1b i;1b b=0;1g(i=2;i<16;++i){m.3A[i]=m.3A[1]}1g(i=0;i<16;++i){1b j=cV[i];1b c=da[a][j];m.h3[j]=1t((1<<bI)/m.3A[j]);m.k1[j]=jY(c);m.k2[j]=((1I-c)*m.3A[j]+127)>>8;m.h4[j]=(db[j]*m.3A[j])>>11;b+=m.3A[j]}1f(b+8)>>4}1e BA(a){1b i;1b b=(a.5Q>=4)?a.2t.3Y:0;1b c=a.2Y.8k;1g(i=0;i<c;++i){1b m=a.1T[i];1b q=m.5P;1b d=1h,am=1h,an=1h;m.8l.3A[0]=cW[2N(q+a.h9,0,127)];m.8l.3A[1]=cX[2N(q,0,127)];m.e9.3A[0]=cW[2N(q+a.ha,0,127)]*2;m.e9.3A[1]=cY[2N(q+a.hb,0,127)];m.ac.3A[0]=cW[2N(q+a.hc,0,117)];m.ac.3A[1]=cX[2N(q+a.hd,0,127)];d=i9(m.8l,0);am=i9(m.e9,1);an=i9(m.ac,2);{m.k5=(3*d*d)>>7;m.k4=(3*am*am);m.k6=(3*an*an)>>6;m.h5=(1*d*d)>>7;m.k8=(7*d*d)>>3;m.k7=(am*am)>>2;m.k9=(an*an)<<1;m.h6=(b*d)>>5}}}1b dc=3;1e BB(a){1b i;1b b=a.2t.4E;1g(i=0;i<be;++i){1b c=1t(b*1I*a.1T[i].5P/128);1b f=1t(c/(1I+a.1T[i].k3));a.1T[i].9l=(f<dc)?0:(f>63)?63:f}a.3S.6V=a.1T[0].9l;a.3S.7N=(a.2t.7l==0)+0;a.3S.6m=a.2t.5t}1b dd=(6);1b de=(-4);1e BC(q){1b c=q/100.;1f(c<0.75)?c*(2./3.):2.*c-1.}1e Bk(a,b){1b i;1b d,fo=1h;1b e=a.2t.5N;1b f=cU*a.2t.3Y/100./128.;1b g=BC(b);1g(i=0;i<e;++i){1b h=(1.-f*a.1T[i].9k)/3.;1b c=4c.13O(g,h);1b q=1t((127.*(1.-c)));1y(h>0.);a.1T[i].5P=2N(q,0,127)}a.h8=a.1T[0].5P;1g(i=e;i<be;++i){a.1T[i].5P=a.h8}d=1t((a.8m-cR)*(dd-de)/(cT-cS));d=1t(d*a.2t.3Y/100);d=2N(d,de,dd);fo=1t(-4*a.2t.3Y/100);fo=2N(fo,-15,15);a.h9=0;a.ha=0;a.hb=0;a.hc=fo;a.hd=d;BA(a);BB(a)}1b df=1c 1d(bo,bp,bq,br);1b dg=1c 1d(bs,bt,bu,bv);1b dh=1c 1d(bw,bx,by,bz,bA,bB,bC,bD,bE,bF);1e lB(a){1b b=a.1x;1b c=a.2P?b.7t:1i;1b d=a.2P?b.7u:1i;1b e=a.3r?b.7s:1i;1b f=a.3r?b.8n+a.2P*16:1i;dK(a.4l,a.5w,c,d,e,f)}1e lC(a){1b b=a.1x;1b c=a.2P?b.8o:1i;1b d=a.2P?b.8p:1i;1b e=a.3r?b.9p:1i;1b f=a.3r?b.ad+a.2P*16:1i;dL(a.4l,a.5w,c,d,e,f)}1e i6(a){dJ(a.4l,a.5w,a.f1,a.f2)}1b di=1c 1d(0+0*bf,4+0*bf,8+0*bf,12+0*bf,0+4*bf,4+4*bf,8+4*bf,12+4*bf,0+8*bf,4+8*bf,8+8*bf,12+8*bf,0+12*bf,4+12*bf,8+12*bf,12+12*bf,0+0*bf,4+0*bf,0+4*bf,4+4*bf,8+0*bf,12+0*bf,8+4*bf,12+4*bf);1b dj=1c 1d(38,32,20,9,32,28,17,7,20,17,10,4,9,7,4,2);1b dk=1c 1d(30,27,19,11,27,24,17,10,19,17,12,8,11,10,8,6);1e fp(a){a.D=0;a.SD=0;a.R=0;a.nz=0;a.2O=bH}1e fq(a,b){a.D=(b.D);a.SD=(b.SD);a.R=(b.R);a.nz=(b.nz);a.2O=(b.2O)}1e lE(a,b){a.D+=b.D;a.SD+=b.SD;a.R+=b.R;a.nz|=b.nz;a.2O+=b.2O}1b dl={ia:1h,ao:1h,lF:1h,5x:4J,4d:4J,5S:1h};1b dm=0;1b dn=1;1b dp=(dm+1+dn);1e ap(a,b){b.2O=b.R*a+1I*(b.D+b.SD)}1e ib(a,b,c){1f b*a+1I*c}1e ic(a,b,c,d,e,f,g){1b h=a.1x.1X.2M[e];1b i=a.1x.1X.h1[e];1b k=(e==0)?1:0;1b l=3m(1c 1d(17,dp),dl);1b o=1c 1d(-1,-1,-1);1b q=4J;1b r;1b s=k-1;1b n=1h,m=1h,p=1h,nz=1h;{1b t=4J;1b u=4J;1b v=1t(f.3A[1]*f.3A[1]/4);1b w=h[cw[k]][d][0];u=0;1g(n=k;n<16;++n){1b j=cV[n];1b x=b[j]*b[j];u+=dk[j]*x;if(x>v)s=n}if(s<15)++s;t=2J(0,w);q=ib(g,t,u);n=k-1;1g(m=-dm;m<=dn;++m){l[n+1][m+dm].5x=0;l[n+1][m+dm].4d=u;l[n+1][m+dm].5S=d}}1g(n=k;n<=s;++n){1b j=cV[n];1b Q=f.3A[j];1b y=f.h3[j];1b B=jY(pC);1b z=(b[j]<0)+0;1b A=(z?-b[j]:b[j])+f.h4[j];1b C;if(A>id)A=id;C=jZ(A,y,B);1g(m=-dm;m<=dn;++m){1b D=l[n+1][m+dm];1b E,ie;1b F=bH;1b G=C+m;1b w;D.lF=z;D.ao=G;D.5S=(G==0)?0:(G==1)?1:2;if(G>=qN||G<0){D.5x=bH;4n}w=h[cw[n+1]][D.5S][0];ie=A-G*Q;E=dk[j]*(A*A-ie*ie);1g(p=-dm;p<=dn;++p){1b H=l[n-1+1][p+dm];1b I=H.5S;1b J=i[cw[n]][I];1b K=H.4d-E;1b t=4J,ig=4J,2O=4J;if(H.5x>=bH){4n}ig=H.5x+hw(J,G);t=ig;if(G&&n<15){t+=2J(1,w)}2O=ib(g,t,K);if(2O<F){F=2O;D.5x=t;D.4d=K;D.ia=p}if(G){t=ig;if(n<15)t+=2J(0,w);2O=ib(g,t,K);if(2O<q){q=2O;o[0]=n;o[1]=m;o[2]=p}}}}}2R(b,+k,0,(16-k)*1F(b));2R(c,+k,0,(16-k)*1F(c));if(o[0]==-1){1f 0}n=o[0];r=o[1];l[n+1][r+dm].ia=o[2];nz=0;1g(;n>=k;--n){1b L=l[n+1][r+dm];1b j=cV[n];c[n]=L.lF?-L.ao:L.ao;nz|=(L.ao!=0);b[j]=c[n]*f.3A[j];r=L.ia}1f nz}1e lG(a,b,c,d,e){1b f=a.1x;1b g=a.4l;1b h=a.5w+df[e];1b i=a.2T;1b j=a.3q+bk;1b k=f.1T[a.2B[a.2u].1Z];1b l=0;1b n=1h;1b m=3m(1d(16,16),4q),ih=1p(16,4q);1g(n=0;n<16;++n){dG(i,j+di[n],g,h+di[n],m[n])}dI(m,ih);l|=dS(ih,b.8q,0,k.e9)<<24;if(cO&&a.8s){1b x,y;9q(a);1g(y=0,n=0;y<4;++y){1g(x=0;x<4;++x){1b o=a.1C[x]+a.1E[y];1b p=ic(a,m[n],b.4H[n],o,0,k.8l,k.k7);a.1C[x]=a.1E[y]=p;l|=p<<n;++n}}}1k{1g(n=0;n<16;++n){l|=dS(m[n],b.4H[n],1,k.8l)<<n}}dH(ih,m);1g(n=0;n<16;n+=2){dF(g,h+di[n],m[n],0,c,d+di[n],1)}1f l}1e lH(a,b,c,d,e,f,g){1b h=a.1x;1b i=a.4l;1b j=a.5w+dh[g];1b k=h.1T[a.2B[a.2u].1Z];1b l=0;1b m=1p(16,4q);dG(c,d,i,j,m);if(cN&&a.8s){1b x=a.1V&3,y=a.1V>>2;1b n=a.1C[x]+a.1E[y];l=ic(a,m,b,n,3,k.8l,k.k8)}1k{l=dS(m,b,0,k.8l)}dF(i,j,m,0,e,f,0);1f l}1e lI(a,b,c,d,e){1b f=a.1x;1b g=a.4l;1b h=a.5w+dg[e];1b i=a.2T;1b j=a.3q+bl;1b k=f.1T[a.2B[a.2u].1Z];1b l=0;1b n;1b m=3m(1c 1d(8,16),4q);1g(n=0;n<8;++n){dG(i,j+di[16+n],g,h+di[16+n],m[n])}if(cP&&a.8s){1b o,x,y;1g(o=0;o<=2;o+=2){n=0;1g(y=0;y<2;++y){1g(x=0;x<2;++x){1b p=a.1C[4+o+x]+a.1E[4+o+y];1b q=ic(a,m[n],b.7v[n],p,2,k.ac,k.k9);a.1C[4+o+x]=a.1E[4+o+y]=q;l|=q<<n;++n}}}}1k{1g(n=0;n<8;++n){l|=dS(m[n],b.7v[n],0,k.ac)<<n}}1g(n=0;n<8;n+=1){dF(g,h+di[16+n],m[n],0,c,d+di[16+n],0)}1f(l<<16)}1e 13P(a,c,b,d){}1e lJ(a){1b b=(a.3j);1b c=(a.3O);a.3j=(a.4G);a.3O=(a.5R);a.4G=(b);a.5R=(c)}1b dq=1n(bU);1e BD(a,b){1b c=a.1x;1b d=c.1T[a.2B[a.2u].1Z];1b e=d.k4;1b f=d.h6;1b g=a.2T;1b h=a.3q+bk;1b i=(dq);1b j;b.hg=-1;1g(j=0;j<4;++j){1b k=a.4G;1b l=a.5R+bk;1b m=1h;m=lG(a,i,k,l,j);i.D=dM(g,h,k,l);i.SD=f?lD(f,dR(g,h,k,l,dj)):0;i.R=Ba(a,i);i.R+=ct[j];ap(e,i);if(j==0||i.2O<b.2O){fq(b,i);b.hg=j;b.nz=m;fM(b.4H,0,i.4H,0,i.4H.1w);1u(b.8q,0,i.8q,0,i.8q.1w);lJ(a)}}ap(d.h5,b);hZ(a,b.hg)}1e BE(a,b){1b c=a.1x.5v;1b x=(a.1V&3),y=a.1V>>2;1b d=(x==0)?a.3N[a.3B+y*c-1]:b[a.1V-1];1b e=(y==0)?a.3N[a.3B-c+x]:b[a.1V-4];1f cu[e][d]}1b dr=1n(bU);1b ds=1n(bU);1b dt=1n(bU);1e BF(a,b){1b c=a.1x;1b d=c.1T[a.2B[a.2u].1Z];1b e=d.k5;1b f=d.h6;1b g=a.2T;1b h=a.3q+bk;1b i=a.4G;1b j=a.5R+bk;1b k=0;1b l=(dr);if(c.hf==0){1f 0}fp(l);l.2O=3f;i0(a);do{1b m=(ds);1b n;1b o=-1;1b p=g;1b q=h+di[a.1V];1b r=BE(a,b.hh);1b s=(i);1b t=(j+di[a.1V]);1b u=(a.4l);1b v=(a.5w+bG);fp(m);i6(a);1g(n=0;n<b2;++n){1b w=(dt);1b x=1p(16,4q);w.nz=lH(a,x,p,q,u,v,n)<<a.1V;w.D=dP(p,q,u,v);w.SD=f?lD(f,dQ(p,q,u,v,dj)):0;w.R=B9(a,x);w.R+=r[n];ap(e,w);if(o<0||w.2O<m.2O){fq(m,w);o=n;1b y=(u);1b z=(v);u=(s);v=(t);s=(y);t=(z);1u(l.4H[a.1V],0,x,0,1F(x)*16)}}ap(d.h5,m);lE(l,m);k+=r[o];if(l.2O>=b.2O||k>c.hf){1f 0}if(t!=j+di[a.1V])dT(s,t,i,j+di[a.1V]);b.hh[a.1V]=o;a.1C[a.1V&3]=a.1E[a.1V>>2]=(m.nz?1:0)}1s(i1(a,i,j));fq(b,l);lx(a,b.hh);lJ(a);fM(b.4H,0,l.4H,0,b.4H.1w);1f 1}1b du=1n(bU);1b dv=1n(bU);1e BG(a,b){1b c=a.1x;1b d=c.1T[a.2B[a.2u].1Z];1b e=d.k6;1b f=a.2T;1b g=a.3q+bl;1b h=a.4G;1b i=a.5R+bl;1b j=a.3j;1b k=a.3O+bl;1b l=(du);1b m;b.hi=-1;fp(l);1g(m=0;m<4;++m){1b n=(dv);n.nz=lI(a,n,h,i,m);n.D=dO(f,g,h,i);n.SD=0;n.R=Bb(a,n);n.R+=cs[m];ap(e,n);if(m==0||n.2O<l.2O){fq(l,n);b.hi=m;fM(b.7v,0,n.7v,0,b.7v.1w);1u(j,k,h,i,bh)}}ly(a,b.hi);lE(b,l)}1e lK(a,b){1b c=a.1x;1b d=(a.2B[a.2u].4Y==1);1b e=0;if(d){e=lG(a,b,a.3j,a.3O+bk,a.3N[a.3B+0])}1k{i0(a);do{1b f=a.3N[a.3B+(a.1V&3)+(a.1V>>2)*c.5v];1b g=a.2T;1b h=a.3q+bk+di[a.1V];1b i=a.3j;1b j=a.3O+bk+di[a.1V];i6(a);e|=lH(a,b.4H[a.1V],g,h,i,j,f)<<a.1V}1s(i1(a,a.3j,a.3O+bk))}e|=lI(a,b,a.3j,a.3O+bl,a.2B[a.2u].e8);b.nz=e}1e lu(a,b,c){1b d=1h;fp(b);lB(a);lC(a);if(c>0){a.8s=(c>2)+0;BD(a,b);if(a.1x.5Q>=2){BF(a,b)}BG(a,b);if(c==2){a.8s=1;lK(a,b)}}1k{a.8s=(a.1x.5Q==2)+0;lK(a,b)}d=(b.nz==0)+0;lz(a,d);1f d}1b dw=1c 1d(1c 1d(1c 1d(1c 1d(128,128,128,128,128,128,128,128,128,128,128),1c 1d(128,128,128,128,128,128,128,128,128,128,128),1c 1d(128,128,128,128,128,128,128,128,128,128,128)),1c 1d(1c 1d(1r,136,1j,1a,4T,2k,128,128,128,128,128),1c 1d(5C,129,5I,1a,4p,2l,1a,2k,128,128,128),1c 1d(106,126,4p,1H,8V,2F,1a,1a,128,128,128)),1c 1d(1c 1d(1,98,2q,1a,3i,4U,1a,1a,128,128,128),1c 1d(5B,133,7S,1j,2G,2A,1a,3o,128,128,128),1c 1d(78,134,6v,2D,4A,6w,1a,2k,128,128,128)),1c 1d(1c 1d(1,6i,2n,1a,2E,1a,128,128,128,128,128),1c 1d(5J,8W,2D,1a,3i,3U,128,128,128,128,128),1c 1d(77,110,7f,1a,3i,5K,128,128,128,128,128)),1c 1d(1c 1d(1,101,1A,1a,3g,1a,128,128,128,128,128),1c 1d(3K,139,3g,1H,3i,2F,1a,1a,128,128,128),1c 1d(37,116,3L,2E,4T,1a,1a,1a,128,128,128)),1c 1d(1c 1d(1,gv,1j,1a,3n,1a,128,128,128,128,128),1c 1d(4L,3M,2r,1a,7S,128,128,128,128,128,128),1c 1d(102,103,4u,1a,3f,1G,128,128,128,128,128)),1c 1d(1c 1d(1,4S,1H,1a,3V,1a,128,128,128,128,128),1c 1d(6h,135,2E,1a,2A,3R,128,128,128,128,128),1c 1d(80,129,3f,1a,9Z,3U,128,128,128,128,128)),1c 1d(1c 1d(1,1,1a,128,128,128,128,128,128,128,128),1c 1d(3W,1,1a,128,128,128,128,128,128,128,128),1c 1d(1a,128,128,128,128,128,128,128,128,128,128))),1c 1d(1c 1d(1c 1d(4A,35,aY,2m,3P,4N,7T,3M,145,3e,62),1c 1d(131,45,4A,2G,a0,4B,6x,4v,1H,2G,1),1c 1d(68,47,146,8X,149,4h,2G,7T,1a,2m,128)),1c 1d(1c 1d(1,149,3g,1a,2G,3U,1a,1a,128,128,128),1c 1d(5J,141,2A,1r,7U,6x,1a,4t,128,128,128),1c 1d(81,99,5B,5I,4B,6y,2n,6v,1a,1a,128)),1c 1d(1c 1d(1,129,5L,1r,8V,5j,5I,3L,1a,1a,128),1c 1d(99,121,gw,2r,3J,4A,1a,6v,128,128,128),1c 1d(23,91,3s,5I,3K,4N,2D,gw,1a,1a,128)),1c 1d(1c 1d(1,gx,3W,1a,2A,1a,128,128,128,128,128),1c 1d(109,7V,3g,1a,4u,3n,1a,1a,128,128,128),1c 1d(44,130,3J,1r,1P,3a,1a,1a,128,128,128)),1c 1d(1c 1d(1,132,3d,1A,2k,2F,1a,4P,128,128,128),1c 1d(94,136,3R,1A,4V,6y,1a,1a,128,128,128),1c 1d(22,100,7W,3n,5p,6S,1a,4t,128,128,128)),1c 1d(1c 1d(1,5q,2n,1a,5L,4O,128,128,128,128,128),1c 1d(124,143,3g,1a,4p,2A,128,128,128,128,128),1c 1d(35,77,5B,1A,3P,3f,1a,1P,128,128,128)),1c 1d(1c 1d(1,4v,2D,1a,3i,4u,1a,1a,128,128,128),1c 1d(121,141,4O,1a,3R,4p,1a,1a,128,128,128),1c 1d(45,99,5M,1A,3E,5D,1a,3U,128,128,128)),1c 1d(1c 1d(1,1,1A,1a,2l,1a,128,128,128,128,128),1c 1d(5i,1,2q,1a,1a,128,128,128,128,128,128),1c 1d(137,1,6h,1a,3U,1a,128,128,128,128,128))),1c 1d(1c 1d(1c 1d(1r,9,2q,1A,4L,8X,1a,3a,128,128,128),1c 1d(2X,13,3U,2E,3P,6i,2n,4A,1a,1a,128),1c 1d(73,17,1G,2G,6S,3Q,3i,4h,1a,2A,128)),1c 1d(1c 1d(1,95,2D,1r,8Y,1O,1a,1a,128,128,128),1c 1d(3d,90,7g,2r,3f,2F,1a,1a,128,128,128),1c 1d(3e,77,3E,2q,5M,3E,1a,1a,128,128,128)),1c 1d(1c 1d(1,24,3d,1A,4V,2k,1a,1P,128,128,128),1c 1d(3J,51,2k,1a,3L,5p,128,128,128,128,128),1c 1d(69,46,6y,3d,3J,4V,1a,4T,128,128,128)),1c 1d(1c 1d(1,2W,1A,1a,1a,128,128,128,128,128,128),1c 1d(2m,4P,2n,1a,2l,1a,128,128,128,128,128),1c 1d(141,124,2q,1a,1a,128,128,128,128,128,128)),1c 1d(1c 1d(1,16,2q,1a,1a,128,128,128,128,128,128),1c 1d(6y,36,5K,1a,3i,1a,128,128,128,128,128),1c 1d(149,1,1a,128,128,128,128,128,128,128,128)),1c 1d(1c 1d(1,4U,1a,128,128,128,128,128,128,128,128),1c 1d(2D,3a,1a,128,128,128,128,128,128,128,128),1c 1d(3V,128,1a,128,128,128,128,128,128,128,128)),1c 1d(1c 1d(1,134,1H,1a,1a,128,128,128,128,128,128),1c 1d(2l,62,2r,1a,1a,128,128,128,128,128,128),1c 1d(55,93,1a,128,128,128,128,128,128,128,128)),1c 1d(1c 1d(128,128,128,128,128,128,128,128,128,128,128),1c 1d(128,128,128,128,128,128,128,128,128,128,128),1c 1d(128,128,128,128,128,128,128,128,128,128,128))),1c 1d(1c 1d(1c 1d(6v,24,2l,4O,5p,2W,6x,3M,3V,2X,1a),1c 1d(126,38,5q,5L,9I,5J,4T,7W,1a,4N,128),1c 1d(61,46,138,2k,4M,7V,3V,3K,1a,7f,128)),1c 1d(1c 1d(1,112,5K,2r,4t,2W,2D,3I,1a,1a,128),1c 1d(3X,109,4T,1H,3f,5h,1a,7W,128,128,128),1c 1d(39,77,7T,5L,a0,6w,3n,7V,1a,1a,128)),1c 1d(1c 1d(1,52,6x,3W,4A,4t,2n,6x,1a,1a,128),1c 1d(124,74,2W,2E,1O,3P,2r,2G,1a,1a,128),1c 1d(24,71,130,2k,3o,3K,2E,5q,1a,1a,128)),1c 1d(1c 1d(1,5q,3R,2n,2k,3V,1a,3U,128,128,128),1c 1d(149,8W,4U,1H,7f,1P,1a,1G,128,128,128),1c 1d(28,108,3K,5I,1O,9Z,1j,2m,1a,1a,128)),1c 1d(1c 1d(1,81,5K,1H,gv,5i,1a,3a,128,128,128),1c 1d(123,102,2F,2D,5M,3L,1a,fW,128,128,128),1c 1d(20,95,9H,2E,8U,5A,1a,5i,128,128,128)),1c 1d(1c 1d(1,7U,2q,1a,7f,2l,128,128,128,128,128),1c 1d(d0,2X,3W,1H,4O,1P,1a,1a,128,128,128),1c 1d(47,116,5h,1a,3f,8Y,1a,1a,128,128,128)),1c 1d(1c 1d(1,121,3i,1r,8Y,8V,1a,1a,128,128,128),1c 1d(141,84,2l,1H,3J,6v,1a,2k,128,128,128),1c 1d(42,80,3M,3V,7T,6i,1a,1P,128,128,128)),1c 1d(1c 1d(1,1,1a,128,128,128,128,128,128,128,128),1c 1d(7g,1,1a,128,128,128,128,128,128,128,128),1c 1d(7S,1,1a,128,128,128,128,128,128,128,128))));1e BH(a){1b b=a.1X;1g(1b i=0;i<b.4w.1w;++i)b.4w[i]=1a;b.2M=1n(dw);b.5m=0}1b dx=1c 1d(1c 1d(1c 1d(4u,120,48,89,115,113,120,4S,112),1c 1d(4S,3Q,64,126,3K,118,46,70,95),1c 1d(2X,69,143,80,85,82,72,3e,103),1c 1d(56,58,10,1G,4V,5C,17,13,4S),1c 1d(114,26,17,3s,44,3E,21,10,5A),1c 1d(121,24,80,3E,26,62,44,64,85),1c 1d(144,71,10,38,1G,2l,144,34,26),1c 1d(3K,46,55,19,136,3M,33,gy,71),1c 1d(63,20,8,114,114,8X,12,9,4U),1c 1d(81,40,11,96,5q,84,29,16,36)),1c 1d(1c 1d(134,1O,89,137,98,101,106,4P,148),1c 1d(72,4N,100,130,4v,111,32,75,80),1c 1d(66,102,4h,99,74,62,40,2A,128),1c 1d(41,53,9,7V,3g,141,26,8,107),1c 1d(74,43,26,146,73,3X,49,23,4v),1c 1d(65,38,105,3M,51,52,31,115,128),1c 1d(104,79,12,27,5D,1a,87,17,7),1c 1d(87,68,71,44,114,51,15,5p,23),1c 1d(47,41,14,110,5q,1O,21,17,9Z),1c 1d(66,45,25,102,5j,5C,23,18,22)),1c 1d(1c 1d(88,88,147,8W,42,46,45,3L,1P),1c 1d(43,97,1O,117,85,38,35,3Q,61),1c 1d(39,53,gx,87,26,21,43,5L,1G),1c 1d(56,34,51,104,114,102,29,93,77),1c 1d(39,28,85,1G,58,4P,90,98,64),1c 1d(34,22,116,gy,23,34,43,3X,73),1c 1d(107,54,32,26,51,1,81,43,31),1c 1d(68,25,106,22,64,1G,36,3R,114),1c 1d(34,19,21,102,132,5M,16,76,124),1c 1d(62,18,78,95,85,57,50,48,51)),1c 1d(1c 1d(3P,101,35,3I,5h,111,89,46,111),1c 1d(60,148,31,a0,2k,4T,21,18,111),1c 1d(112,113,77,85,3Q,1a,38,120,114),1c 1d(40,42,1,3L,3n,2F,10,25,109),1c 1d(88,43,29,140,3X,2l,37,43,3o),1c 1d(61,63,30,3e,67,45,68,1,2F),1c 1d(100,80,8,43,3o,1,51,26,71),1c 1d(142,78,78,16,1a,128,34,5j,1G),1c 1d(41,40,5,102,3f,1O,4,1,2G),1c 1d(51,50,17,d0,2F,3a,23,25,82)),1c 1d(1c 1d(138,31,36,1G,27,3X,38,44,9J),1c 1d(67,87,58,9I,82,115,26,59,3Q),1c 1d(63,59,90,6w,59,3X,93,73,3o),1c 1d(40,40,21,116,143,2F,34,39,2X),1c 1d(47,15,16,1O,34,2m,49,45,1O),1c 1d(46,17,33,1O,6,98,15,32,1O),1c 1d(57,46,22,24,128,1,54,17,37),1c 1d(65,32,73,115,28,128,23,128,1P),1c 1d(40,3,9,115,51,3a,18,6,2m),1c 1d(87,37,9,115,59,77,64,21,47)),1c 1d(1c 1d(104,55,44,4V,9,54,53,130,4U),1c 1d(64,90,70,1P,40,41,23,26,57),1c 1d(54,57,112,5J,5,41,38,3X,2l),1c 1d(30,34,26,133,4S,116,10,32,134),1c 1d(39,19,53,2G,26,114,32,73,1a),1c 1d(31,9,65,2A,2,15,1,118,73),1c 1d(75,32,12,51,3a,1a,3M,43,51),1c 1d(88,31,35,67,102,85,55,5p,85),1c 1d(56,21,23,111,59,1P,45,37,3a),1c 1d(55,38,70,124,73,102,1,34,98)),1c 1d(1c 1d(125,98,42,88,104,85,117,2X,82),1c 1d(95,84,53,89,128,100,113,101,45),1c 1d(75,79,123,47,51,128,81,1G,1),1c 1d(57,17,5,71,102,57,53,41,49),1c 1d(38,33,13,121,57,73,26,1,85),1c 1d(41,10,67,138,77,110,90,47,114),1c 1d(115,21,2,10,102,1a,3X,23,6),1c 1d(101,29,16,10,85,128,101,3L,26),1c 1d(57,18,10,102,102,2l,34,20,43),1c 1d(117,20,15,36,3s,128,68,1,26)),1c 1d(1c 1d(102,61,71,37,34,53,31,2E,3a),1c 1d(69,60,71,38,73,119,28,7U,37),1c 1d(68,45,128,34,1,47,11,3n,1G),1c 1d(62,17,19,70,146,85,55,62,70),1c 1d(37,43,37,3o,100,3s,85,3M,1),1c 1d(63,9,92,136,28,64,32,3J,85),1c 1d(75,15,9,9,64,1a,5J,119,16),1c 1d(86,6,28,5,64,1a,25,2q,1),1c 1d(56,8,17,132,137,1a,55,116,128),1c 1d(58,15,20,82,135,57,26,121,40)),1c 1d(1c 1d(8U,50,31,137,3o,133,25,35,4V),1c 1d(51,103,44,131,131,123,31,6,c9),1c 1d(86,40,64,135,148,3U,45,1O,128),1c 1d(22,26,17,131,3V,3o,14,1,2F),1c 1d(45,16,21,91,64,7U,7,1,5j),1c 1d(56,21,39,3e,60,138,23,102,2l),1c 1d(83,12,13,54,3a,1a,68,47,28),1c 1d(85,26,85,85,128,128,32,146,1G),1c 1d(18,11,7,63,144,1G,4,4,3W),1c 1d(35,27,10,146,7W,1G,12,26,128)),1c 1d(1c 1d(6y,80,35,99,6w,80,126,54,45),1c 1d(85,126,47,87,4B,51,41,20,32),1c 1d(101,75,128,139,118,146,116,128,85),1c 1d(56,41,15,4B,3i,85,37,9,62),1c 1d(71,30,17,119,118,1a,17,18,138),1c 1d(101,38,60,138,55,70,43,26,142),1c 1d(146,36,19,30,1G,1a,97,27,20),1c 1d(138,45,61,62,2k,1,81,5M,64),1c 1d(32,41,20,117,4M,142,20,21,3s),1c 1d(112,19,12,61,3E,128,48,4,24)));1e BI(a,b,c){if(1D(a,b!=bd,c[0])){if(1D(a,b!=9K,c[1])){if(1D(a,b!=9L,c[2])){if(!1D(a,b>=b0,c[3])){if(1D(a,b!=9M,c[4])){1D(a,b!=fX,c[5])}}1k{if(1D(a,b!=b0,c[6])){if(1D(a,b!=fY,c[7])){1D(a,b!=fZ,c[8])}}}}}}1f b}1e BJ(a,b){if(1D(a,(b==9P||b==9O),jj)){1D(a,b==9P,128)}1k{1D(a,b==9N,3s)}}1e BK(a,b){if(1D(a,b!=b3,142)){if(1D(a,b!=9N,114)){1D(a,b!=9O,1O)}}}1e BL(a,s,p,b){if(1D(a,s>=2,p[b+0]))b+=1;1D(a,s&1,p[b+1])}1b dy=1n(bV);1e pp(a){1b b=a.7r;1b c=(dy);fm(a,c);do{1b d=c.2B[c.2u];1b e=c.3N;1b f=c.3B;if(a.2Y.4Q){BL(b,d.1Z,a.1X.4w,0)}if(a.1X.5m){1D(b,d.4x,a.1X.9j)}if(1D(b,(d.4Y!=0),145)){BJ(b,e[f+0])}1k{1b g=a.5v;1b h=e;1b i=f-g;1b x,y;1g(y=0;y<4;++y){1b j=e[f-1];1g(x=0;x<4;++x){1b k=dx[h[i+x]][j];j=BI(b,e[f+x],k)}i=f;f+=g}}BK(b,d.e8)}1s(fn(c,0,0))}1b dz=1c 1d(1c 1d(1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(4B,3W,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2m,3g,1H,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2n,1r,1r,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,7g,1H,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2A,1j,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1r,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,3W,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(3d,1r,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1a,1j,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,2q,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1A,1a,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1r,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1A,1j,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1a,1j,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1j,1r,1a,1j,1a,1a,1a,1a,1a,1a),1c 1d(2r,1a,1j,1a,1j,1a,1a,1a,1a,1a,1a),1c 1d(1j,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a))),1c 1d(1c 1d(1c 1d(5D,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(3R,1H,3g,1r,1a,1a,1j,1a,1a,1a,1a),1c 1d(2A,2r,3g,2r,1r,1a,1r,1j,1a,1a,1a)),1c 1d(1c 1d(1a,1j,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2m,1j,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(7S,1r,1j,1j,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,2q,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2n,1j,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1r,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2D,1j,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1r,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1H,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1j,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1r,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1j,1r,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2r,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a))),1c 1d(1c 1d(1c 1d(5p,1A,2r,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2A,1A,7g,1j,1a,1a,1a,1a,1a,1a,1a),1c 1d(1A,1A,2E,1r,1j,1a,1j,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1r,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(3i,1r,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1A,1r,1r,1j,1j,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1j,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1j,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1j,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1j,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a))),1c 1d(1c 1d(1c 1d(2q,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2r,1j,1H,1j,1a,1a,1a,1a,1a,1a,1a),1c 1d(2q,1j,2n,1r,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1r,1r,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(3W,1r,1r,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1H,1j,1A,1j,1j,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1j,1H,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2q,1j,1r,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1r,1a,1j,1j,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1A,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(3n,1A,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1r,1r,1j,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1A,1r,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1H,1r,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1j,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1H,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2n,1a,1j,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1j,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1r,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(2r,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a)),1c 1d(1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1j,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a),1c 1d(1a,1a,1a,1a,1a,1a,1a,1a,1a,1a,1a))));1e po(a,d){1b t,b,c,p;1g(t=0;t<6k;++t){1g(b=0;b<6l;++b){1g(c=0;c<5E;++c){1g(p=0;p<6U;++p){1b e=d.2M[t][b][c][p];1b f=(e!=dw[t][b][c][p])+0;if(1D(a,f,dz[t][b][c][p])){5a(a,e,8)}}}}}if(4a(a,d.5m)){5a(a,d.9j,8)}}1e i2(a){1f a<0?0:a>1a?1a:a}1e BM(a){1b b=0,ij=0,7w=0;1b k;1b c=1h;1g(k=0;k<bc;++k){if(a[k+1]){7w+=a[k+1];b+=7w*(k+1);ij+=(k+1)*(k+1)}}c=ij?1t(10*b/ij-5):0;1f i2(c)}1e BN(a,b,c,d,e,f){1b g=1p(bc+1,0);1b h=1p(16,4q);1b j,k;1g(j=e;j<f;++j){dG(a,b+di[j],c,d+di[j],h);1g(k=0;k<16;++k){1b v=4c.5T(h[k])>>2;h[k]=(v>bc)?bc:v}1g(k=0;k<16;++k){g[h[k]]++}}1f BM(g)}1b cj=1p((1a+ga+1),1m);1b ck=0;1e hp(a){if(!ck){1b i;1g(i=-1a;i<=1a+1a;++i){cj[1a+i]=(i<0)?0:(i>1a)?1a:i}ck=1}}1e 5o(v){1f(!(v&~1v))?v:v<0?0:1a}1b dA=mR+(1<<16);1b dB=mS;1e 6u(a,b){1f(((a)*(b))>>16)}1b C=1p(4*4,1h),dD,1M;1M=0;1e lL(e,f,g,h,j,k){1b C=1p(4*4,1h),dD,1M;1M=0;1b i;dD=C;1g(i=0;i<4;++i){1b a=g[h+0]+g[h+8];1b b=g[h+0]-g[h+8];1b c=((g[h+4]*dB)>>16)-((g[h+12]*dA)>>16);1b d=((g[h+4]*dA)>>16)+((g[h+12]*dB)>>16);dD[1M+0]=a+d;dD[1M+1]=b+c;dD[1M+2]=b-c;dD[1M+3]=a-d;1M+=4;h++}1M=0;1g(i=0;i<4;++i){1b l=dD[1M+0]+4;1b a=l+dD[1M+8];1b b=l-dD[1M+8];1b c=((dD[1M+4]*dB)>>16)-((dD[1M+12]*dA)>>16);1b d=((dD[1M+4]*dA)>>16)+((dD[1M+12]*dB)>>16);j[k+0+i*bf]=5o(e[f+0+i*bf]+((a+d)>>3));j[k+1+i*bf]=5o(e[f+1+i*bf]+((b+c)>>3));j[k+2+i*bf]=5o(e[f+2+i*bf]+((b-c)>>3));j[k+3+i*bf]=5o(e[f+3+i*bf]+((a-d)>>3));1M++}}1e BO(a,b,c,d,e,f,g){lL(a,b,c,d,e,f);if(g){lL(a,b+4,c,d+16,e,f+4)}}1e BP(a,b,c,d,e){1b i;1g(i=0;i<4;++i){1b f=a[b+0]-c[d+0];1b g=a[b+1]-c[d+1];1b h=a[b+2]-c[d+2];1b j=a[b+3]-c[d+3];1b k=(f+j)<<3;1b l=(g+h)<<3;1b m=(g-h)<<3;1b n=(f-j)<<3;dD[0+i*4]=(k+l)+0;dD[1+i*4]=(m*ik+n*il+13Q)>>12;dD[2+i*4]=(k-l)+0;dD[3+i*4]=(n*ik-m*il+13R)>>12;b+=bf,d+=bf}1g(i=0;i<4;++i){1b k=(dD[0+i]+dD[12+i]);1b l=(dD[4+i]+dD[8+i]);1b m=(dD[4+i]-dD[8+i]);1b n=(dD[0+i]-dD[12+i]);e[0+i]=(k+l+7)>>4;e[4+i]=((m*ik+n*il+13S)>>16)+(n!=0)+0;e[8+i]=(k-l+7)>>4;e[12+i]=((n*ik-m*il+13T)>>16)}1f e}1b dC=0;1e BQ(a,b){dC=0;1b i;1g(i=0;i<4;++i){1b c=a[0+i]+a[12+i];1b d=a[4+i]+a[8+i];1b e=a[4+i]-a[8+i];1b f=a[0+i]-a[12+i];dD[0+i]=c+d;dD[8+i]=c-d;dD[4+i]=f+e;dD[12+i]=f-e}1g(i=0;i<4;++i){1b g=dD[0+i*4]+3;1b c=g+dD[3+i*4];1b d=dD[1+i*4]+dD[2+i*4];1b e=dD[1+i*4]-dD[2+i*4];1b f=g-dD[3+i*4];b[dC+0][0]=(c+d)>>3;b[dC+1][0]=(f+e)>>3;b[dC+2][0]=(c-d)>>3;b[dC+3][0]=(f-e)>>3;dC+=4}}1e BR(a,b){1b c=0;1b i;1g(i=0;i<4;++i){1b d=(a[c+0][0]+a[c+2][0])<<2;1b e=(a[c+1][0]+a[c+3][0])<<2;1b f=(a[c+1][0]-a[c+3][0])<<2;1b g=(a[c+0][0]-a[c+2][0])<<2;dD[0+i*4]=(d+e)+(d!=0)+0;dD[1+i*4]=g+f;dD[2+i*4]=g-f;dD[3+i*4]=d-e;c+=4}1g(i=0;i<4;++i){1b d=(dD[0+i]+dD[8+i]);1b e=(dD[4+i]+dD[12+i]);1b f=(dD[4+i]-dD[12+i]);1b g=(dD[0+i]-dD[8+i]);1b h=d+e;1b j=g+f;1b k=g-f;1b l=d-e;b[0+i]=(h+(h>0)+3)>>3;b[4+i]=(j+(j>0)+3)>>3;b[8+i]=(k+(k>0)+3)>>3;b[12+i]=(l+(l>0)+3)>>3}}1e aq(a,b,c,d){1b j;1g(j=0;j<d;++j){2R(a,b+j*bf,c,d)}}1e fr(a,b,c,d,e){1b j;if(c){1g(j=0;j<e;++j)1u(b,a+j*bf,c,d,e)}1k{aq(b,a,127,e)}}1e fs(a,b,c,d,e){if(c){1b j;1g(j=0;j<e;++j){2R(b,a+j*bf,c[d+j],e)}}1k{aq(b,a,129,e)}}1e 7R(a,b,c,d,e,f,g){1b y;if(c){if(e){1b h=cj;1b i=+1a-c[d-1];1g(y=0;y<g;++y){1b j=h;1b k=i+c[d+y];1b x;1g(x=0;x<g;++x){b[a+x]=j[k+e[f+x]]}a+=bf}}1k{fs(a,b,c,d,g)}}1k{if(e){fr(a,b,e,f,g)}1k{aq(b,a,129,g)}}}1e im(a,b,c,d,e,f,g,h,i){1b k=0;1b j;if(e){1g(j=0;j<g;++j)k+=e[f+j];if(c){1g(j=0;j<g;++j)k+=c[d+j]}1k{k+=k}k=(k+h)>>i}1k if(c){1g(j=0;j<g;++j)k+=c[d+j];k+=k;k=(k+h)>>i}1k{k=aZ}aq(b,a,k,g)}1e BS(a,b,c,d,e,f){im(bs+b,a,c,d,e,f,8,8,4);fr(bu+b,a,e,f,8);fs(bv+b,a,c,d,8);7R(bt+b,a,c,d,e,f,8);b+=8;if(e)f+=8;if(c)d+=16;im(bs+b,a,c,d,e,f,8,8,4);fr(bu+b,a,e,f,8);fs(bv+b,a,c,d,8);7R(bt+b,a,c,d,e,f,8)}1e BT(a,b,c,d,e,f){im(bo+b,a,c,d,e,f,16,16,5);fr(bq+b,a,e,f,16);fs(br+b,a,c,d,16);7R(bp+b,a,c,d,e,f,16)}1e 1o(a,b,c){1f(((a)+2*(b)+(c)+2)>>2)};1e 1U(a,b){1f(((a)+(b)+1)>>1)};1e gc(a,b,c,d){1b e=1c 1d();e.2c(1o(c[d-1],c[d+0],c[d+1]));e.2c(1o(c[d+0],c[d+1],c[d+2]));e.2c(1o(c[d+1],c[d+2],c[d+3]));e.2c(1o(c[d+2],c[d+3],c[d+4]));1b i;1g(i=0;i<4;++i){1u(b,a+i*bf,e,0,4)}}1e gd(a,b,c,d){1b X=c[d-1];1b I=c[d-2];1b J=c[d-3];1b K=c[d-4];1b L=c[d-5];b[a+0+0*bf]=b[a+1+0*bf]=b[a+2+0*bf]=b[a+3+0*bf]=1o(X,I,J);b[a+0+1*bf]=b[a+1+1*bf]=b[a+2+1*bf]=b[a+3+1*bf]=1o(I,J,K);b[a+0+2*bf]=b[a+1+2*bf]=b[a+2+2*bf]=b[a+3+2*bf]=1o(J,K,L);b[a+0+3*bf]=b[a+1+3*bf]=b[a+2+3*bf]=b[a+3+3*bf]=1o(K,L,L)}1e ge(a,b,c,d){1b e=4;1b i;1g(i=0;i<4;++i)e+=c[d+i]+c[d-5+i];aq(b,a,e>>3,4)}1e gf(a,b,c,d){1b X=c[d-1];1b I=c[d-2];1b J=c[d-3];1b K=c[d-4];1b L=c[d-5];1b A=c[d+0];1b B=c[d+1];1b C=c[d+2];1b D=c[d+3];b[a+(0)+(3)*bf]=1o(J,K,L);b[a+(0)+(2)*bf]=b[a+(1)+(3)*bf]=1o(I,J,K);b[a+(0)+(1)*bf]=b[a+(1)+(2)*bf]=b[a+(2)+(3)*bf]=1o(X,I,J);b[a+(0)+(0)*bf]=b[a+(1)+(1)*bf]=b[a+(2)+(2)*bf]=b[a+(3)+(3)*bf]=1o(A,X,I);b[a+(1)+(0)*bf]=b[a+(2)+(1)*bf]=b[a+(3)+(2)*bf]=1o(B,A,X);b[a+(2)+(0)*bf]=b[a+(3)+(1)*bf]=1o(C,B,A);b[a+(3)+(0)*bf]=1o(D,C,B)}1e gg(a,b,c,d){1b A=c[d+0];1b B=c[d+1];1b C=c[d+2];1b D=c[d+3];1b E=c[d+4];1b F=c[d+5];1b G=c[d+6];1b H=c[d+7];b[a+(0)+(0)*bf]=1o(A,B,C);b[a+(1)+(0)*bf]=b[a+(0)+(1)*bf]=1o(B,C,D);b[a+(2)+(0)*bf]=b[a+(1)+(1)*bf]=b[a+(0)+(2)*bf]=1o(C,D,E);b[a+(3)+(0)*bf]=b[a+(2)+(1)*bf]=b[a+(1)+(2)*bf]=b[a+(0)+(3)*bf]=1o(D,E,F);b[a+(3)+(1)*bf]=b[a+(2)+(2)*bf]=b[a+(1)+(3)*bf]=1o(E,F,G);b[a+(3)+(2)*bf]=b[a+(2)+(3)*bf]=1o(F,G,H);b[a+(3)+(3)*bf]=1o(G,H,H)}1e gh(a,b,c,d){1b X=c[d-1];1b I=c[d-2];1b J=c[d-3];1b K=c[d-4];1b A=c[d+0];1b B=c[d+1];1b C=c[d+2];1b D=c[d+3];b[a+(0)+(0)*bf]=b[a+(1)+(2)*bf]=1U(X,A);b[a+(1)+(0)*bf]=b[a+(2)+(2)*bf]=1U(A,B);b[a+(2)+(0)*bf]=b[a+(3)+(2)*bf]=1U(B,C);b[a+(3)+(0)*bf]=1U(C,D);b[a+(0)+(3)*bf]=1o(K,J,I);b[a+(0)+(2)*bf]=1o(J,I,X);b[a+(0)+(1)*bf]=b[a+(1)+(3)*bf]=1o(I,X,A);b[a+(1)+(1)*bf]=b[a+(2)+(3)*bf]=1o(X,A,B);b[a+(2)+(1)*bf]=b[a+(3)+(3)*bf]=1o(A,B,C);b[a+(3)+(1)*bf]=1o(B,C,D)}1e gi(a,b,c,d){1b A=c[d+0];1b B=c[d+1];1b C=c[d+2];1b D=c[d+3];1b E=c[d+4];1b F=c[d+5];1b G=c[d+6];1b H=c[d+7];b[a+(0)+(0)*bf]=1U(A,B);b[a+(1)+(0)*bf]=b[a+(0)+(2)*bf]=1U(B,C);b[a+(2)+(0)*bf]=b[a+(1)+(2)*bf]=1U(C,D);b[a+(3)+(0)*bf]=b[a+(2)+(2)*bf]=1U(D,E);b[a+(0)+(1)*bf]=1o(A,B,C);b[a+(1)+(1)*bf]=b[a+(0)+(3)*bf]=1o(B,C,D);b[a+(2)+(1)*bf]=b[a+(1)+(3)*bf]=1o(C,D,E);b[a+(3)+(1)*bf]=b[a+(2)+(3)*bf]=1o(D,E,F);b[a+(3)+(2)*bf]=1o(E,F,G);b[a+(3)+(3)*bf]=1o(F,G,H)}1e gj(a,b,c,d){1b I=c[d-2];1b J=c[d-3];1b K=c[d-4];1b L=c[d-5];b[a+(0)+(0)*bf]=1U(I,J);b[a+(2)+(0)*bf]=b[a+(0)+(1)*bf]=1U(J,K);b[a+(2)+(1)*bf]=b[a+(0)+(2)*bf]=1U(K,L);b[a+(1)+(0)*bf]=1o(I,J,K);b[a+(3)+(0)*bf]=b[a+(1)+(1)*bf]=1o(J,K,L);b[a+(3)+(1)*bf]=b[a+(1)+(2)*bf]=1o(K,L,L);b[a+(3)+(2)*bf]=b[a+(2)+(2)*bf]=b[a+(0)+(3)*bf]=b[a+(1)+(3)*bf]=b[a+(2)+(3)*bf]=b[a+(3)+(3)*bf]=L}1e gk(a,b,c,d){1b X=c[d-1];1b I=c[d-2];1b J=c[d-3];1b K=c[d-4];1b L=c[d-5];1b A=c[d+0];1b B=c[d+1];1b C=c[d+2];b[a+(0)+(0)*bf]=b[a+(2)+(1)*bf]=1U(I,X);b[a+(0)+(1)*bf]=b[a+(2)+(2)*bf]=1U(J,I);b[a+(0)+(2)*bf]=b[a+(2)+(3)*bf]=1U(K,J);b[a+(0)+(3)*bf]=1U(L,K);b[a+(3)+(0)*bf]=1o(A,B,C);b[a+(2)+(0)*bf]=1o(X,A,B);b[a+(1)+(0)*bf]=b[a+(3)+(1)*bf]=1o(I,X,A);b[a+(1)+(1)*bf]=b[a+(3)+(2)*bf]=1o(J,I,X);b[a+(1)+(2)*bf]=b[a+(3)+(3)*bf]=1o(K,J,I);b[a+(1)+(3)*bf]=1o(L,K,J)}1e gb(a,b,c,d){1b x,y;1b e=cj;1b f=+1a-c[d-1];1g(y=0;y<4;++y){1b g=e;1b h=f+c[d-2-y];1g(x=0;x<4;++x){b[a+x]=g[h+c[d+x]]}a+=bf}}1e BU(a,b,c,d){ge(bw+b,a,c,d);gb(bx+b,a,c,d);gc(by+b,a,c,d);gd(bz+b,a,c,d);gf(bA+b,a,c,d);gh(bB+b,a,c,d);gg(bC+b,a,c,d);gi(bD+b,a,c,d);gk(bE+b,a,c,d);gj(bF+b,a,c,d)}1e ft(a,c,b,d,w,h){1b e=0;1b y,x;1g(y=0;y<h;++y){1g(x=0;x<w;++x){1b f=a[c+x]-b[d+x];e+=f*f}c+=bf;d+=bf}1f e}1e BV(a,c,b,d){1f ft(a,c,b,d,16,16)}1e BW(a,c,b,d){1f ft(a,c,b,d,16,8)}1e BX(a,c,b,d){1f ft(a,c,b,d,8,8)}1e BY(a,c,b,d){1f ft(a,c,b,d,4,4)}1b dD=1p(16,1h);1e lM(a,b,w){1b c=0;1b i;1b d=0;1g(i=0;i<4;++i){1b e=(a[b+0]+a[b+2])<<2;1b f=(a[b+1]+a[b+3])<<2;1b g=(a[b+1]-a[b+3])<<2;1b h=(a[b+0]-a[b+2])<<2;dD[0+i*4]=e+f+(e!=0)+0;dD[1+i*4]=h+g;dD[2+i*4]=h-g;dD[3+i*4]=e-f;b+=bf}1g(i=0;i<4;++i){1b e=(dD[0+i]+dD[8+i]);1b f=(dD[4+i]+dD[12+i]);1b g=(dD[4+i]-dD[12+i]);1b h=(dD[0+i]-dD[8+i]);1b j=e+f;1b k=h+g;1b l=h-g;1b m=e-f;c+=w[d+0]*((4c.5T(j)+3)>>3);c+=w[d+4]*((4c.5T(k)+3)>>3);c+=w[d+8]*((4c.5T(l)+3)>>3);c+=w[d+12]*((4c.5T(m)+3)>>3);++d}1f c}1e lN(a,c,b,d,w){1b e=lM(a,c,w);1b f=lM(b,d,w);1f(4c.5T(f-e)+8)>>4}1e BZ(a,c,b,d,w){1b D=0;1b x,y=1h;1g(y=0;y<16*bf;y+=4*bf){1g(x=0;x<16;x+=4){D+=lN(a,c+x+y,b,d+x+y,w)}}1f D}1e C0(a,b,n,c){1b d=-1;1g(;n<16;++n){1b j=cV[n];1b e=(a[j]<0);1b f=(e?-a[j]:a[j])+c.h4[j];if(f>id)f=id;if(f>c.k2[j]){1b Q=c.3A[j];1b g=c.h3[j];1b B=c.k1[j];b[n]=jZ(f,g,B);if(e)b[n]=-b[n];a[j]=b[n]*Q;if(b[n])d=n}1k{b[n]=0;a[j]=0}}1f(d>=0)+0}1e io(a,b,c,d,e){1b y;1g(y=0;y<e;++y){1u(c,d,a,b,e);b+=bf;d+=bf}}1e C1(a,b,c,d){io(a,b,c,d,4)}1e C3(a,b,c,d){io(a,b,c,d,8)}1e C4(a,b,c,d){io(a,b,c,d,16)}1b dE;1b dF;1b dG;1b dH;1b dI;1b dJ;1b dK;1b dL;1b dM;1b dN;1b dO;1b dP;1b dQ;1b dR;1b dS;1b dT;1b dU;1b dV;1e C5(a){hp();dE=BN;dF=BO;dG=BP;dH=BQ;dI=BR;dJ=BU;dK=BT;dL=BS;dM=BV;dN=BX;dO=BW;dP=BY;dQ=lN;dR=BZ;dS=C0;dT=C1;dU=C3;dV=C4}1e oR(a,b,c,d){if(d!=N){1f 0}if(a==1i)1f 0;a.8e=c;a.8f=0;a.7k=0.;a.8g=3;a.3Y=50;a.4E=20;a.5t=0;a.7l=0;a.6z=0;a.5N=4;a.7n=1;a.8h=0;a.8i=0;a.7m=0;a.9d=0;a.8j=0;if(ea){a.8e=ea.8e?ea.8e:c;a.8f=ea.8f?ea.8f:0;a.7k=ea.7k?ea.7k:0.;a.8g=ea.8g?ea.8g:0;a.3Y=ea.3Y?ea.3Y:50;a.4E=ea.4E?ea.4E:20;a.5t=ea.5t?ea.5t:0;a.7l=ea.7l?ea.7l:0;a.6z=ea.6z?ea.6z:0;a.5N=ea.5N?ea.5N:4;a.7n=ea.7n?ea.7n:1;a.8h=ea.8h?ea.8h:0;a.8i=ea.8i?ea.8i:0;a.7m=ea.7m?ea.7m:0;a.9d=ea.9d?ea.9d:0;a.8j=ea.8j?ea.8j:0;b=ea.13U?ea.13V:P.gV}fH(b){3l P.oL:a.3Y=80;a.5t=4;a.4E=35;1Q;3l P.oM:a.3Y=80;a.5t=3;a.4E=30;1Q;3l P.oN:a.3Y=25;a.5t=6;a.4E=10;1Q;3l P.oO:a.3Y=0;a.4E=0;1Q;3l P.oP:a.3Y=0;a.4E=0;a.5N=2;1Q;3l P.gV:fI:1Q}1f lO(a)}1e lO(a){if(a==1i)1f 0;if(a.8e<0||a.8e>100)1f 0;if(a.8f<0)1f 0;if(a.7k<0)1f 0;if(a.8g<0||a.8g>6)1f 0;if(a.5N<1||a.5N>4)1f 0;if(a.3Y<0||a.3Y>100)1f 0;if(a.4E<0||a.4E>100)1f 0;if(a.5t<0||a.5t>7)1f 0;if(a.7l<0||a.7l>1)1f 0;if(a.7m<0||a.7m>1)1f 0;if(a.7n<1||a.7n>10)1f 0;if(a.8h<0||a.8h>1)1f 0;if(a.8i<0||a.8i>1)1f 0;if(a.6z<0||a.6z>3)1f 0;if(a.8j<0||a.8j>100)1f 0;if(a.9d<0)1f 0;1f 1}1b dW=13W;1q.13X=1e(a){1f(Z<<16)|(ba<<8)|bb};1e C6(a,b,c){1f 1}1e oZ(d,e){if(e!=N){1f 0}if(d){d=1n(V);d.7p=1e C6(a,b,c){};4m(d,U)}1f 1}1e gB(a){1b b=a.2Y;b.8k=a.2t.5N;b.4Q=(b.8k>1)+0;b.e6=0}1e C7(a){1b b=a.3S;b.7N=1;b.6V=0;b.6m=0;b.e7=0}1e C8(a){1b i;1b b=a.3N;1b c=a.3B-a.5v;1b d=a.3N;1b e=a.3B-1;1g(i=-1;i<4*a.1S;++i){b[c+i]=bd}1g(i=0;i<4*a.2Z;++i){d[e+i*a.5v]=bd}a.2g[1-1]=0}1e C9(a){1b b=a.2t.8g;1b c=100-a.2t.8j;a.5Q=b;a.kc=(b>=6)?3:(b>=5)?2:(b>=3)?1:0;a.hf=1t(1I*16*16*(c*c)/(100*100))}1e Ca(a,b){1b c=(a.4E>0)||(a.7m>0);1b d=(b.1z+15)>>4;1b e=(b.1B+15)>>4;1b f=4*d+1;1b g=4*e+1;1b h=f*g*1F(1m);1b i=d*16;1b j=(d+1)*1F(2C);1b k=(3*bi+bj)*1F(1m);1b l=d*e*1F(bQ);1b m=(2*i+16+16+16+8+1+2*bn)*1F(1m);1b n=a.7m?1F(bM)+bn:0;1b o=1n(bT);1b p=1m;1b q=1F(bT)+bn+k+l+h+m+j+n;p=4f(q,1m);if(p==1i){4m(b,oT);1f 1i}o.3h=1<<a.6z;o.1S=d;o.2Z=e;o.5v=f;o.2T=aJ(1m,bi);o.3j=aJ(1m,bi);o.4G=aJ(1m,bi);o.4l=aJ(1m,bj);o.3y=9v(l,bQ);o.3N=1p((f*g*1F(1m)+1+o.5v),1m);o.3B=+1+o.5v;o.2g=1p(1+j,1m);o.4F=1;o.4Z=n?1n(bM):1i;o.7s=1p((2*i+(16)+(16+16)+(16)+(8)),1m);o.8n=0;o.9p=o.7s;o.ad=o.8n+i;o.7t=o.9p;o.7u=(2*i)+(16);o.8o=o.7t;o.8p=o.7u+(16+16);o.ae=o.8o;o.af=o.8p+(16);o.2t=a;o.9R=c?((a.7l==1)?0:1):2;o.2I=b;C9(o);C5();BH(o);gB(o);C7(o);C8(o);p9(o);pd(o);1f o}1e Cb(a){if(a){pc(a);pg(a);a=\'\'}}1e fu(a,b){1f a?10.*(4c.Bl*4c.Bm(1a.*1a.*b/a)):99.}1e Cc(a){1b b=a.2I.3Z;1b c=a.he;1b d=a.9o;b.6F[0]=al(fu(d[0],c));b.6F[1]=al(fu(d[1],c/4));b.6F[2]=al(fu(d[2],c/4));b.6F[3]=al(fu(d[0]+d[1]+d[2],c*3/2))}1e Cd(a){1b b=a.2I.3Z;1b c=a.2I.aa;if(c){1b i,s;1g(i=0;i<be;++i){b.jN[i]=a.1T[i].9l;b.jM[i]=a.1T[i].5P;1g(s=0;s<=2;++s){b.e4[s][i]=a.kb[s][i]}}Cc(a);b.7o=a.ka;1g(i=0;i<3;++i){b.e3[i]=a.f0[i]}}}1e 4m(a,b){1y(b<=jU);1y(b>=U);a.oX=b;1f 0}1e Ce(a,b){1b c=1n(bT);1b d=1h;if(b==1i)1f 0;4m(b,U);if(a==1i)1f 4m(b,jS);if(!lO(a))1f 4m(b,oU);if(b.1z<=0||b.1B<=0)1f 4m(b,jT);if(b.y==1i||b.u==1i||b.v==1i)1f 4m(b,jS);if(b.1z>=dW||b.1B>=dW)1f 4m(b,jT);c=Ca(a,b);if(c==1i)1f 0;d=Bz(c)&&Bn(c)&&Bi(c)&&pb(c)&&pf(c)&&pq(c);Cd(c);Cb(c);1f d}1e fv(a){if(a.9f)Cf(a);if(a){1b b=a.2e&gW;1b c=a.2e&a9;1b d=a.1z;1b e=a.1B;1b f=d;1b g=1t((d+1)/2);1b h=1t((e+1)/2);1b i=g;1b j=0;1b k=1h,3v=1h;1b l=3b,ar=3b,as=3b,5e=3b,5H=3b;1b m=1m;1b n=0;fH(b){3l T:1Q;3l jR:1Q;3l jP:j=g;1Q;3l jQ:j=d;1Q;fI:1f 0}as=e*j;k=c?d:0;3v=k;l=f*e;ar=i*h;5e=3v*e;5H=l+5e+2*ar+2*as;if(d<=0||e<=0||g<0||h<0||l>=(64*64*64*16<<40)||5H!=5H){1f 0}a.2d=f;a.2j=i;a.3v=3v;a.jW=j;lP(a);a.y=4f(5H,1m);a.2v=0;if(a.y==1i)1f 0;a.u=a.y;a.2s=a.2v+l;a.v=a.u;a.2w=a.2s+ar;m=4f(5H,1m);if(m==1i)1f 0;a.y=m;a.2v=n;n+=l;a.u=m;a.2s=n;n+=ar;a.v=m;a.2w=n;n+=ar;if(5e){a.a=4f(5e,1m);a.3u=0}if(as){a.u0=m;a.gY=n;n+=as;a.v0=m;a.gZ=n;n+=as}}1f 1}1e Cg(a,b){if(a)b=a;b.y=b.u=b.v=1i;b.2v=b.2s=b.2w=1i;b.u0=b.v0=1i;b.gY=b.gZ=1i;b.a=1i;b.3u=1i}1e lP(a){if(a){a.y=\'\';a.y=a.u=a.v=1i;a.2v=a.2s=a.2w=0;Cg(1i,a)}}1b dX={8x:1m,Ch:0,fw:3c,3F:3c,13Y:0};1e Ci(a){a.8x=1i;a.Ch=0;a.3F=0;a.fw=0}1e Cj(a,b,c){1b w=c.jV;1b d=3c;if(w==1i){3k(\'w is 1i\');1f 1}d=(w.3F)+b;if(d>w.fw){1b e=1m;1b f=0;1b g=w.fw*2;if(g<d)g=d;if(g<ke)g=ke;e=4f(g,1m);if(e==1i){1f 0}if((w.3F)>0){1u(e,f,w.8x,0,w.3F)}w.8x=\'\';w.8x=e;w.fw=g}if(b){1u((w.8x),+(w.3F),a,0,b);w.3F+=b}1f 1}1b dY=16;1e lQ(v){v=(v+(8A<<(dY+2-1)))>>(dY+2);1f((v&~1v)==0)?v:(v<0)?0:1a}1e Ck(r,g,b){1b a=(1<<(dY-1))+(16<<dY);1b c=13Z*r+14a*g+kW*b;1f(c+a)>>dY}1e lR(r,g,b){1f lQ(-14b*r-14c*g+Cl*b)}1e lS(r,g,b){1f lQ(+Cl*r-14d*g-14e*b)}1e Cm(a){1b y;1b b=(a.1z+1)>>1;1g(y=0;y<((a.1B+1)>>1);++y){2R(a.u,a.2s+y*a.2j,128,b);2R(a.v,a.2w+y*a.2j,128,b)}}1e 6C(h,i,j,k,l,m){1b n=h.2e&gW;1b x,y=1h;1b o=i;1b p=+(l?2:0);1b q=i;1b s=+1;1b t=i;1b u=+(l?0:2);1b v=h.1z;1b w=h.1B;1e Cn(a,b){1f(a[b+0]+a[b+k]+a[b+j]+a[b+j+k])}1e lT(a,b){1f(2*a[b+0]+2*a[b+k])}1e Co(a,b){1f(2*a[b+0]+2*a[b+j])}1e ip(a,b){1f(4*a[b+0])}1e fx(x,y,a){1b c=(2*(k*(x)+(y)*j));1b d=(x)+(y)*h.2j;1b r=a(o,p+c);1b g=a(q,s+c);1b b=a(t,u+c);h.u[h.2s+d]=lR(r,g,b);h.v[h.2w+d]=lS(r,g,b)}1e iq(a,c,y,d){1b e=(k*(a)+(y)*j);1b f=(c)+(y)*h.jW;1b r=d(o,p+e);1b g=d(q,s+e);1b b=d(t,u+e);h.u0[h.gY+f]=lR(r,g,b);h.v0[h.gZ+f]=lS(r,g,b)}1g(y=0;y<w;++y){1g(x=0;x<v;++x){1b z=k*x+y*j;h.y[h.2v+x+y*h.2d]=Ck(o[p+z],q[s+z],t[u+z])}}if(n!=jR){1g(y=0;y<(w>>1);++y){1g(x=0;x<(v>>1);++x){fx(x,y,Cn)}if(h.1z&1){fx(x,y,Co)}}if(w&1){1g(x=0;x<(v>>1);++x){fx(x,y,lT)}if(v&1){fx(x,y,ip)}}if(n==jP){1g(y=0;y<w;++y){1g(x=0;x<(v>>1);++x){iq(2*x,x,y,lT)}if(v&1){iq(2*x,x,y,ip)}}}1k if(n==jQ){1g(y=0;y<w;++y){1g(x=0;x<v;++x){iq(x,x,y,ip)}}}}1k{Cm(h)}if(m){1b A=i;1b B=+3;1y(k>=4);1g(y=0;y<w;++y){1g(x=0;x<v;++x){h.a[h.3u+x+y*h.3v]=A[B+k*x+y*j]}}}1f 1}1e Cp(a,b,c){a.2e&=~a9;if(!fv(a))1f 0;1f 6C(a,b,c,3,0,0)}1e Cq(a,b,c){a.2e&=~a9;if(!fv(a))1f 0;1f 6C(a,b,c,3,1,0)}1e Cr(a,b,c){a.2e|=a9;if(!fv(a))1f 0;1f 6C(a,b,c,4,0,1)}1e Cs(a,b,c){a.2e|=a9;if(!fv(a))1f 0;1f 6C(a,b,c,4,1,1)}1b dZ,8y;1e fy(e,f,g,h,j,k,l){1b m=0;1b n=1n(V);1b o=1n(O);1b p=1n(dX);1b q=1h;n.9f=ea.9f?ea.9f:0;if(!oQ(o,P.gV,k)||!oY(n)){1f 0}n.1z=f;n.1B=g;n.7p=1e(a,b,c,d){1f Cj(a,b,c,d)};n.jV=p;p.8x=l.1L;p.3F=m;Ci(p);q=j(n,e,h)&&Ce(o,n);if(q)ir=1n(n.3Z);1k ir=1i;if(q)8y=1n(n);1k 8y=1i;lP(n);if(!q){l=\'\';l=1i;1f 0}1b r=1c 1d();1g(1b i=0;i<p.3F;++i)r.2c(iH.mj(p.8x[i]));r=r.iF("");l.1L=r;m=p.3F;1f m}1q.14f=1e(a,w,h,b,q,c){1f fy(a,w,h,b,Cp,q,c)};1q.14g=1e(a,w,h,b,q,c){1f fy(a,w,h,b,Cq,q,c)};1q.14h=1e(a,w,h,b,q,c){1f fy(a,w,h,b,Cr,q,c)};1q.14i=1e(a,w,h,b,q,c){1f fy(a,w,h,b,Cs,q,c)};1b ea=1i;1q.14j=1e(a){ea=a};1e Cf(a){1b b=1t((a.1z+15)/16);1b c=1t((a.1B+15)/16);a.5u=4f(b*c*1F(a.5u),1m)}1q.14k=1e(){1e l(b,l){b=b+\'\';1b a=\'\',i;1b c=l-(4o b.1w!==\'4I\'?b.1w:1);c=l<0?0:c;1g(i=0;i<c;++i)a+=\' \';1f a+b};1e fz(a,b,c){1b s,2Q=\'\';1b d=0;1g(s=0;s<4;++s){2Q+="| "+l(a[s],7)+" ";d+=a[s];if(c)c[s]+=a[s]}1f 2Q+"| "+l(d,7)+"  ("+((100.*d/b).7y(1))+"%)\\n"};1e Ct(a,b){1b s,2Q=\'\';1g(s=0;s<4;++s){2Q+="|     "+l(1t(100*a[s]/b),3)+"%"}1f 2Q+"| "+l(b,7)+"\\n"};1e lU(a){1b s,2Q=\'\';1g(s=0;s<4;++s){2Q+="| "+l(a[s],7)+" "}1f 2Q+"|\\n"};if(!ir)1f\'\';1b e=ir;1b f=e.e3[0];1b g=e.e3[1];1b h=e.e3[2];1b j=f+g;2Q=""+l(e.7o,7)+" lV Y-U-V-14l-6F "+(e.6F[0].7y(2))+" "+(e.6F[1].7y(2))+" "+(e.6F[2].7y(2))+"   "+(e.6F[3].7y(2))+" dB\\n";if(j>0){1b k=1c 1d(0,0,0,0);2Q+="Cu 14m:  Cv: "+f+"\\n"+"              Cw: "+g+"  (-> "+((100.*g/j).7y(2))+"%)\\n"+"              14n Cu: "+h+" ("+((100.*h/j).7y(2))+"%)\\n"+"lV 14o:  a1:         "+l(e.9e[0],6)+"  ("+((100.*e.9e[0]/e.7o).7y(1))+"%)\\n"+"             14p-nN: "+l(e.9e[1],6)+"  ("+((100.*e.9e[1]/e.7o).7y(1))+"%)\\n"+" 14q lV  |d4 1|d4 2|d4 3|d4 4|  Cx\\n"+"  Cv-8v:  "+fz(e.e4[0],e.7o,k)+""+" Cw-8v:  "+fz(e.e4[1],e.7o,k)+""+"  14r 8v:  "+fz(e.e4[2],e.7o,k)+""+"    14s:  "+Ct(e.jL,j)+""+"      14t:  "+lU(e.jM)+""+"   nO ao:  "+lU(e.jN)+""+"------------------+---------+---------+---------+---------+-----------------\\n"+" 5N Cx:  "+fz(k,e.7o,1i)+""}2Q+="";if(8y.5u){1b m=1t((8y.1z+15)/16);1b n=1t((8y.1B+15)/16);1b o=8y.9f;1b x,y;1g(y=0;y<n;++y){1g(x=0;x<m;++x){1b c=8y.5u[x+y*m];if(o==1){1b p="+.";2Q+=p[c%2]}1k if(o==2){1b q=".-*X";2Q+=q[c%4]}1k if(o==3){2Q+=l(c,2)+" "}1k if(o==6||o==7){2Q+=l(c,3)+" "}1k{2Q+="mh"+(c<16?"0":"")+c.iE(16)+" "}}2Q+="\\n"}}1f 2Q}}',62,4122,'||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||255|var|new|Array|function|return|for|int|null|254|else|value|uint8_t|newObjectIt|AVG3|Arr|this|253|while|parseInt|memcpy|0xff|length|enc_|assert|width|251|height|top_nz_|VP8PutBit|left_nz_|sizeof|171|252|256|YUVA|buf_off|output|tmp_off|0x153|183|205|break|buf_|mb_w_|dqm_|AVG2|i4_|0x053|proba_|mem_|segment_|||||||||||mb_h|VP8GetBit|push|y_stride|colorspace|range_|nz_|br_|parts_|uv_stride|219|213|223|249|mb_y_|mb_x_|248|250|u_off|config_|mb_off|y_off|v_off|VP8_STATUS_BITSTREAM_ERROR|mb_w|VP8SetError|234|mb_|uint32_t|247|243|209|221|output_|pic_|VP8BitCost|0x0d3|VP8Get|coeffs_|clip|score|x_|str|memset_|io_|yuv_in_|stride|VP8_STATUS_INVALID_PARAM|191|175|segment_hdr_|mb_h_|||||||||||192|uint64_t|size_t|239|155|211|241|num_parts_|236|yuv_out_|alert|case|ArrM|245|154|YUV_RANGE_MIN|yuv_in_off|y_|163|double|a_off|a_stride|RGBA|value_|mb_info_|lnz|q_|preds_off|BIT|zip_outoff|195|size|memory|buf_end_|159|201|170|196|160|preds_|yuv_out_off|193|179|225|filter_hdr_|alpha_data_|224|240|246|166|sns_strength|stats|||||||||||VP8PutBitUniform|0x093|Math|error|status|malloc|VP8_STATUS_SUSPENDED|167|cache_uv_stride_|alpha_data_size_|1020|yuv_p_|WebPEncodingSetError|continue|typeof|227|int16_t|MODE_YUV|y_accum|199|231|157|segments_|skip_|filter_type_|FilterLoop24|198|176|state_|dec_|filter_strength|nz_off|yuv_out2_|y_ac_levels|undefined|score_t|mb_y|207|151|187|235|165|update_map_|tmp|152|228|226|218|IDecError|nb_bits_|type_|lf_stats_|||||||||||VP8PutValue|last|InitResidual|uint16_t|a_size|crop_left|crop_top|215|203|197|dc_nz_|status_|use_skip_proba_|cache_y_stride_|clip_8b|186|182|FUNC_NAME|end_|filter_sharpness|extra_info|preds_w_|yuv_p_off|cost|rgba|eof_|173|181|189|217|NUM_CTX|f_info_|layer_data_size_|total_size|242|184|230|232|188|segments|pos_|quant_|method_|yuv_out2_off|ctx|abs|SetResidualCoeffs|max_code|u_stride|scaled_width|scaled_height|data_off|||||||||||dst|dst_off|scaler_y|scaler_u|scaler_a|missing_|VP8GetValue|177|185|VP8GetSignedValue|NUM_TYPES|NUM_BANDS|sharpness_|f_inner_|filter_row_|ready_|pic_hdr_|use_threads_|thread_ctx_|yuv_b_|MUL|202|180|220|190|partitions|ext_buf_off|first|Import|mode_|start_|PSNR|prob|1024|next|root|data|int32_t|MODE_RGBA|MODE_BGRA|v_stride|VP8_STATUS_NOT_ENOUGH_DATA|use_scaling|scaler_v|161|NUM_MB_SEGMENTS|NUM_PROBAS|level_|id_|intra_t_|intra_l_|cache_y_|||||||||||cache_u_|cache_y_off|cache_u_off|non_zero_|do_filter2|216|244|PACK|InitRescaler|params_|target_PSNR|filter_type|autofilter|pass|coded_size|writer|run_|bw_|y_top_|y_left_|y_left_off|uv_levels|val|VP8PutSignedValue|toFixed|true|len|zip_bd|BMAX|MODE_BGR|MODE_ARGB|MODE_RGBA_4444|rgba_off|data_size|dst_width|last_y|emit|partition_length_|height_|simple_|cache_v_|cache_v_off|is_i4x4_|TrueMotion|238|162|222|178|174|RIFF|FUNC_NAME_SAMPLE|FUNC_NAME_YUV444|||||||||||left_|info_|token_br_|MemDataSize|quality|target_size|method|show_compressed|preprocessing|partition_limit|num_segments_|y1_|uv_alpha_|y_top_off|u_left_|u_left_off|y_dc_levels|i4_boundary_|do_trellis_|pos2|0x013|coeffs|maxx|mem|pic_tmp|258|257|slice|int8_t|memset|is_external_memory|VP8_STATUS_OUT_OF_MEMORY|VP8_STATUS_USER_ABORT|use_cropping|teardown|crop_bottom|options_|emit_alpha|width_|f_level_|f_ilevel_|cache_id_|non_zero_ac_|layer_data_|0x01|FilterLoop26|164|214|150|208|212|get_le32|||||||||||VP8YuvToRgb|buf_size_|Decode|alpha_compression|header_bytes|extra_info_type|VP8BitWriterPos|VP8BitWriterSize|MAX_VARIABLE_LEVEL|skip_proba_|alpha_|fstrength_|has_alpha_|use_layer_|sse_|uv_top_|VP8IteratorNzToBytes|zip_qtail|dyn_tree|static_tree|parse|Arr_nOI|WebPInitDecBuffer|bypass_filtering|opaque|setup|x_expand|irow|irow_off|frow|frow_off|tmp_y|tmp_u|153|169|229|B_TM_PRED|B_VE_PRED|B_HE_PRED|V_PRED|H_PRED|TM_PRED|key_frame_|profile_|use_segment_|y2_mat_|worker_|num_caches_|br_mb_y_|TransformDC|needs_filter|194|172|header|VP8kUToG|VP8kUToB|VP8YuvToBgr|ExportRow|uv_j|WebPResetDecParams|DecodeIntoRGBABuffer|WEBP_CSP_ALPHA_BIT|stats_nozero|max_pos_|uv_|uv_top_off|v_left_|v_left_off|pos3|0x033|band|770|Record|parseFloat|q16|quv|level|SetRDScore|Fill|uv_size|uv0_size|extra_bits|extra_base|elems|max_length|false|static_lenb|0x3fff|list|288|input|void_|float|bits|write32BitIn4Bytes|write4BytesIn32Bit|ArrCopy|membuild|memcmp|MODE_YUVA|y_size|u_size|v_size|private_memory|put|fancy_upsampling|crop_right|x_add|x_sub|tmp_v|tmp_y_off|tmp_u_off|237|0x80|B_LD_PRED|B_HU_PRED|NUM_BMODES|DC_PRED|MAX_NUM_PARTITIONS|absolute_delta_|quantizer_|filter_strength_|br_mb_x_|mem_size_|||||||||||||||||||||||||||||||||||||||||||||||||||||imodes_|alpha_data_off|Put16|Put8x8uv|hev|needs_filter2|SimpleVFilter16|SimpleHFilter16|384|158|||||||||||||||||||||||||||||||||||||||||||||||||||||168|buf_end_off|VP8GetHeaders|cannot|segment|nz_dc|LOAD_UV|right|Rescale|MEM_MODE_APPEND|||||||||||||||||||||||||||||||||||||||||||||||||||||part0_size_|WebPINewDecoder|DecodeInto|block_count|residual_bytes|MAX_LF_LEVELS|size_|i4x4_lf_delta_|uv_mode_|y2_|||||||||||||||||||||||||||||||||||||||||||||||||||||block_count_|i4_top_|i4_top_off|bit_count_|1792|1569|883|1193|1479|GetResidualCost|||||||||||||VP8IteratorInit|VP8IteratorNext|dq_uv_dc|InitScore|CopyScore|VerticalPred|HorizontalPred|GetSSE|GetPSNR|WebPPictureAlloc|max_size|RGB_TO_UV|Encode|PrintByteCount|WebPZlib|32768|too|4096|off|0xffff|zip_td|switch|default|throw|char|Byte2Hex|memcpyArrM|MODE_RGB_565|MODE_LAST|private_memory_off|VP8_STATUS_UNSUPPORTED_FEATURE|VP8StatusCode|VP8_STATUS_OK|y_sub|tmp_v_off|VP8InitBitReader|233|B_RD_PRED|B_VL_PRED|B_HD_PRED|NUM_REF_LF_DELTAS|use_lf_delta_|y1_mat_|uv_mat_|tl_mb_x_|tl_mb_y_|y_t_|u_t_|v_t_|filter_levels_|510|TM4|VE4|HE4|DC4|RD4|LD4|VR4|VL4|HU4|HD4|do_filter4|SimpleVFilter16i|SimpleHFilter16i|VFilter16i|HFilter16i|VFilter8i|HFilter8i|DoFilter|Copy32b|274|204|210|200|206|VP8CheckAndSkipHeader|VP8XGetInfo|ResetSegmentHeader|WebPCheckAndSkipRIFFHeader|0x100|GetCoeffs|out_l_nz|YUV_RANGE_MAX|VP8YuvToRgb565|VP8YuvToArgb|VP8YuvToRgba4444|VP8YuvToBgra|VP8YuvToRgba|0x00020002|MULT|IsAlphaMode|tmp_size2|STATE_PARTS0|STATE_DATA|part0_buf_|GetOutputBuffer|GetFeatures|WEBP_PRESET_DEFAULT|WEBP_CSP_UV_MASK|VP8_ENC_ERROR_BITSTREAM_OUT_OF_MEMORY|u0_off|v0_off|error_|level_cost_|nb_skip_|iq_|sharpen_|lambda_mode_|tlambda_|layer_bw_|base_quant_|dq_y1_dc_|dq_y2_dc_|dq_y2_ac_|dq_uv_dc_|dq_uv_ac_|sse_count_|max_i4_header_bits_|mode_i16|modes_i4|mode_uv|luma_bits_|uv_bits_|VP8BitWriterInit|VP8BitWriterFinish|VP8BitWriterAppend|pad|InitTables|xxm|xym|yym|Accumulate|BitWriterResize|kFlush|VP8LevelCost|1216|951|640|0x023|901|1410|1540|1925|4407|4422|4439|4454|5496|5511|5528|5543|663|1257|723|930|715|833|851|894|553|RecordCoeffs|PutCoeffs|VP8IteratorImport|VP8SetIntra16Mode|VP8IteratorStartI4|VP8IteratorRotateI4|ClipAlpha|GetProba|max_a|dist_accum|VP8MakeIntra4Preds|best_uv_alpha||ExpandMatrix|prev|RDScoreTrellis|TrellisQuantizeBlock|2047|new_error||base_cost|dc_tmp||den|2217|5352|DCMode||Copy|SUM1|RGB_TO_UV0|pic_stats||ptr|512|279|280|286|Not|short|long|int64_t|instanceof|int64BitLeft|toString|join|memset_wl|String|crop_width|crop_height|VP8InitIo|fy_scale|fx_scale|fxy_scale|y_add|dst_stride|VP8BitUpdate|VP8Shift|B_VR_PRED|show_|colorspace_|ref_lf_delta_|mode_lf_delta_|error_msg_|frm_hdr_|skip_p_|uvmode_|alpha_plane_|layer_data_off|VP8DecompressAlphaRows|WebPAllocateDecBuffer|WebPFreeDecBuffer|WebPCopyDecBuffer|TransformOne|VP8FinishRow|frame|VP8InitFrame|VP8StoreBlock|MACROBLOCK_VPOS|VP8ProcessRow|WebPWorkerSync|VP8EnterCritical|VP8ExitCritical|CheckMode|VP8ReconstructBlock|156|SetOk|VP8New|VP8Delete|VP8Clear|VP8GetInfo|Inconsistent|information|0x003|VP8DecodeMB|VP8InitScanline|VP8Decode|VP8YuvToArgbKeepA|VP8YuvToRgba4444KeepA|UpsampleRgbLinePair|UpsampleBgrLinePair|UpsampleRgb565LinePair|ImportRow|pos|WebPInitCustomIo|STATE_DONE|STATE_ERROR|MEM_MODE_MAP|part0_buf_off|CheckMemBufferMode|IDecode|IDecCheckStatus|DefaultFeatures|segment_size|segment_quant|segment_level|alpha_data_size|WEBP_YUV422|WEBP_YUV444|WEBP_YUV400|VP8_ENC_ERROR_NULL_PARAMETER|VP8_ENC_ERROR_BAD_DIMENSION|VP8_ENC_ERROR_BAD_WRITE|custom_ptr|uv0_stride|VP8BitWriterBuf|BIAS|QUANTDIV|stats_|bias_|zthresh_|beta_|lambda_i16_|lambda_i4_|lambda_uv_|lambda_trellis_i16_|lambda_trellis_i4_|lambda_trellis_uv_|coded_size_|residual_bytes_|rd_opt_level_|done_|8192|PutLE32|PutLE24|5025|GetMBSSIM|best_level|VP8BranchCost|1366|1280|1152|1110|1076|342|1202|1275|1337|1454|1790|2059|2325|3635|3786|3853|3868|3935|4086|4076|4227|4294|4309|4376|4527|5423|5574|5641|5656|5723|5874|5864|6015|6082|6097|6164|6315|6420|439|2060|1218|1319|1279|1345|711|1583|1179|1026|1430|1561|1182|605|1162|1062|733|516|1088|943|1372|705|1153|766|617|1621|979|1232|1112|1618|981|ResetStats|VP8IteratorBytesToNz|VP8Decimate|OneStatPass|InitLeft|VP8SetIntra4Mode|VP8SetIntraUVMode|VP8SetSkip|range_a|VP8MakeLuma16Preds|VP8MakeChroma8Preds|MULT_8B|AddScore|sign|ReconstructIntra16|ReconstructIntra4|ReconstructUV|SwapOut|SimpleQuantize|ITransformOne|TTransform|Disto4x4|WebPValidateConfig|WebPPictureFree|clip_uv|rgb_to_u|rgb_to_v|SUM2H|PrintValues|bytes|large|good_length|max_lazy|nice_length|max_chain|287|385|769|1025|1537|N_MAX|HufBuild|DataError|enough|Unable|inflate|the|compress|uncompress|JSON|charCodeAt|0x|string|fromCharCode|0x0002|WEBP_CSP_MODE|MODE_RGB|WebPInitDecBufferInternal|has_alpha|bitstream_version|WebPGetFeatures|WebPGetFeaturesInternal|no_fancy_upsampling|options|WebPInitDecoderConfigInternal|VP8InitIoInternal|src_width|src_height|dst_height|OutputFunc|VP8GetByte|VP8GetSigned|B_DC_PRED_NOTOP|B_DC_PRED_NOLEFT|B_DC_PRED_NOTOPLEFT|NUM_MODE_LF_DELTAS|xscale_|yscale_|clamp_type_|buffer_flags_|layer_colorspace_|CheckDecBuffer|AllocateBuffer|todo|WebPGrabDecBuffer|VP8DecodeLayer|VP8DspInitTables|20091|35468|TransformTwo|TransformUV|TransformDCUV|TransformWHT|VP8TransformWHT|TM8uv|TM16|VE16|HE16|DC16|DC16NoTop|DC16NoLeft|DC16NoTopLeft|VE8uv|HE8uv|DC8uv|DC8uvNoLeft|DC8uvNoTop|DC8uvNoTopLeft|do_filter6|VFilter16|HFilter16|VFilter8|HFilter8|VP8DspInit|InitThreadContext|initialization|failed|AllocateMemory|f_info_off|InitIo||hev_thresh_from_level|FilterRow|not|Frame|0x0f0000|0xf00000|259|264|269|284||VP8ParseQuant|VP8ResetProba|VP8ParseIntraMode|VP8ParseProba|0x9d|0x2a|VP8X|ParseSegmentHeader|ParsePartitions|ParseFilterHeader|VP8Io|Invalid|container|partition|filter|ParseResiduals|0xf|ParseFrame|VP8YUVInit|UpsampleRgbaLinePair|UpsampleBgraLinePair|UpsampleArgbLinePair|UpsampleRgba4444LinePair|UpsampleRgbKeepAlphaLinePair|UpsampleBgrKeepAlphaLinePair|UpsampleArgbKeepAlphaLinePair|UpsampleRgba4444KeepAlphaLinePair|InitUpsamplers|SampleRgbLinePair|SampleBgrLinePair|SampleRgbaLinePair|SampleBgraLinePair|SampleArgbLinePair|SampleRgba4444LinePair|SampleRgb565LinePair|Yuv444ToRgb|Yuv444ToBgr|Yuv444ToRgba|Yuv444ToBgra|Yuv444ToArgb|Yuv444ToRgba4444||Yuv444ToRgb565|EmitYUV|EmitSampledRGB|EmitFancyRGB|EmitAlphaYUV|EmitAlphaRGB|EmitRescaledYUV|EmitRescaledAlphaYUV|InitYUVRescaler|ExportRGB|EmitRescaledRGB|ExportAlpha|EmitRescaledAlphaRGB|InitRGBRescaler|memory_off|InitFromOptions|CustomSetup|CustomPut|CustomTeardown|AppendToMemBuffer|RemapMemBuffer|InitMemBuffer|ClearMemBuffer|SaveContext|RestoreContext|DecodeHeader|CopyParts0Data|DecodePartition0|DecodeRemaining|params_out|WebPGetInfo|WEBP_PRESET_PICTURE|WEBP_PRESET_PHOTO|WEBP_PRESET_DRAWING|WEBP_PRESET_ICON|WEBP_PRESET_TEXT|WebPConfigPreset|WebPConfigInitInternal|layer_data_size|VP8_ENC_ERROR_OUT_OF_MEMORY|VP8_ENC_ERROR_INVALID_CONFIGURATION|VP8_ENC_ERROR_PARTITION0_OVERFLOW|VP8_ENC_ERROR_PARTITION_OVERFLOW|error_code|WebPPictureInit|WebPPictureInitInternal||||mb_info_off|y_offset_|uv_offset_|y_stride_|uv_stride_|CompressAlpha|VP8EncInitAlpha|VP8EncCodeAlphaBlock|VP8EncFinishAlpha|VP8EncDeleteAlpha|VP8EncInitLayer|VP8EncCodeLayerBlock|VP8EncFinishLayer|VP8EncDeleteLayer|PutHeader|PutSegmentHeader|PutFilterHeader|PutQuant|EmitPartitionsSize|WriteExtensions|GeneratePartition0|VP8WriteProbas|VP8CodeIntraModes|VP8EncWrite|VP8EncVFilter16i|VP8EncHFilter16i|VP8EncVFilter8i|VP8EncHFilter8i|VP8EncSimpleVFilter16i|VP8EncSimpleHFilter16i|GetILevel|GetSSIM|VP8InitFilter|VP8StoreFilterStats|VP8AdjustFilterStrength|0x00|1536|992|968|939|878|871|854|786|768|740|720|666|592|586|572|534|522|488|477|424|419|403|370|||||362|336|330|323|316|305|302|299|268|0x001|0x00f|432|1101|1221|1294|1085|1158|1380|1453|1469|1491|1547|1601|1638|1653|1716|1731|1775|1853|1868|1733|1759|1780|1800|1815|1821|1847|1878|1884|1893|1910|1916|1931|1951|1957|2048|2121|2138|2199|2216|2183|2189|2206|2247|2392|2430|2619|2634|2651|2666|3092|3273|3278|3636|3708|3723|3740|3755|3515|3521|3530|3536|3547|3553|3562|3568|3588|3594|3603|3609|3620|3626|3641|3666|3672|3681|3687|3698|3704|3713|3719|3739|3745|3754|3760|3771|3777|3792|3815|3821|3830|3836|3847|3862|3888|3894|3903|3909|3920|3926|3941|3966|3972|3981|3987|3998|4004|4013|4019|4039|4045|4054|4060|4071|4077|4092|3956|3962|3971|3977|3988|3994|4003|4009|4029|4035|4044|4050|4061|4067|4082|4107|4113|4122|4128|4139|4145|4154|4160|4180|4186|4195|4201|4212|4218|4233|4256|4262|4271|4277|4288|4303|4329|4335|4344|4350|4361|4367|4382|4413|4428|4445|4460|4480|4486|4495|4501|4512|4518|4533|4328|4334|4343|4349|4360|4366|4375|4381|4401|4416|4433|4448|4479|4485|4494|4500|4511|4517|4526|4532|4552|4558|4567|4573|4584|4590||4599|4605|4628|4634|4643|4649|4660|4666|4675|4681|4701|4707|4716|4722|4733|4739|4748|4754|4779|4785|4794|4800|4811|4817|4826|4832|4852|4858|4867|4873|4884|4890|4899|4905|4769|4775|4784||4790|4801|4807|4816|4822|4842|4848|4857|4863|4874|4880|4889|4895|4920|4926|4935|4941|4952|4958|4967|4973|4993|4999|5008|5014|5031|5040|5046|5069|5075|5084|5090|5101|5107|5116|5122|5142|5148|5157|5163|5174|5180|5189|5195|5220|5226|5235|5241|5252|5258|5267|5273|5293|5299|5308|5314|5325|5331|5340|5346|4604||4610|4619|4625|4636|4642|4651|4657|4677|4683|4692|4698|4709|4715|4724|4730|4755|4761|4770|4776|4787|4793|4802|4808|4828|4834|4843|4849|4860|4866|4875|4881|4904|4910|4919|4925|4936|4942|4951|4957|4977|4983|4992|4998|5009|5015|5024|5030|5055|5061|5070|5076|5087|5093|5102|5108|5128|5134|5143|5149|5160|5166|5175|5181|5045|5051|5060|5066|5077|5083|5092|5098|5118|5124|5133|5139||5150|5156|5165|5171|5196|5202|5211|5217|5228|5234|5243|5249|5269|5275|5284|5290|5301|5307|5316|5322|5345|5351|5360|5366|5377|5383|5392|5398|5418|5424|5433|5439|5450|5456|5465|5471|5502|5517|5534|5549|5569|5575|5584|5590|5601|5607|5616|5622|5417|5432|5438|5449|5455|5464|5470|5490|5505|5522|5537|5568|5583|5589|5600|5606|5615|5621|5647|5662|5673||5679|5688|5694|5717|5732|5738|5749|5755|5764|5770|5790|5796|5805|5811|5822|5828|5837|5843|5868|5883|5889|5900|5906|5915|5921|5941|5947|5956|5962|5973|5979|5988|5994|5858|5873|5879|5890|5896|5905|5911|5931|5937|5946|5952|5963|5969|5978|5984|6009|6024|6030|6041|6047|6056|6062|6088|6103|6114|6120|6129|6135||6158|6173|6179|6190|6196|6205|6211|6231|6237|6246|6252|6263|6269|6278|6284|6309|6324|6330|6341|6347|6356|6362|6382|6388|6397|6403|6414|6429|6435|6195|6210|6227|6242|7284|7299|7316|7331|VariableLevelCost|VP8CalculateLevelCosts|919|1839|1507|1924|1393|1823|1074|1270|847|2094|1353|1322|1573|1752|1756|1820|1248|964|963|1508|1418|613|1870|1831|1493|1664|1207|1087|1729|1350|1296|544|610|957|1553|1704|1226|960|1617|1252|1441|1828|1636|734|1713|866|641|1739|1045|952|1303|1086|1170|884|1267|1488|703|2057|1273|699|1672|920|999|1414|1220|2145|1404|1381|1500|826|1556|1550|1228|3861|961|1810|2081|803|895|1708|1198|1103|1574|1052|1312|1205|1288|1529|1861|862|1039|1609|1100|1188|789|1333|975|1289|1478|1522|1530|1227|1375|1149|1309|1241|1690|1361|1299|1184|1456|1761|933|1515|1554|1286|1378|1850|1720|1268|614|1195|1243|1476|966|1396|1798|coeff_type|CalcSkipProba|FinalizeSkipProba|ResetTokenStats|CalcTokenProba|FinalizeTokenProbas|VP8GetCostLuma4|VP8GetCostLuma16|VP8GetCostUV|CodeResiduals|RecordResiduals|ResetSSE|StoreSSE|StoreSideInfo|ResetAfterSkip|VP8EncLoop|VP8IteratorExport|VP8SetSegmentParams|LOG10E|log|VP8StatLoop|InitTop|VP8IteratorReset|VP8SetSegment|SmoothSegmentMap|SetSegmentProbas|SetSegmentAlphas|AssignSegments|MBAnalyzeBestIntra16Mode|MBAnalyzeBestIntra4Mode|MBAnalyzeBestUVMode|MBAnalyze|VP8EncAnalyze|SetupMatrices|SetupFilterStrength|QualityToCompression|PickBestIntra16|GetCostModeI4|PickBestIntra4|PickBestUV|VP8DefaultProbas|PutI4Mode|PutI16Mode|PutUVMode|PutSegment|VP8GetAlpha|CollectHistogram|ITransform|FTransform|ITransformWHT|FTransformWHT|IntraChromaPreds|Intra16Preds|Intra4Preds|SSE16x16|SSE16x8|SSE8x8|SSE4x4|Disto16x16|QuantizeBlock|Copy4x4||Copy8x8|Copy16x16|VP8EncDspInit|DummyWriter|ResetFilterHeader|ResetBoundaryPredictions|MapConfigToTools|InitEncoder|DeleteEncoder|FinalizePSNR|StoreStats|WebPEncode|AllocExtraInfo|WebPPictureGrabSpecs|mem_off|InitMemoryWriter|WebPMemoryWrite|rgb_to_y|28800|MakeGray|SUM4|SUM2V|WebPPictureImportRGB|WebPPictureImportBGR|WebPPictureImportRGBA|WebPPictureImportBGRA|PrintPercents|block|intra4|intra16|total|0x2000|zip_INBUFSIZ|small|zip_WSIZE|zip_HASH_BITS|Code|clever|0xfff|fixed_bd|0x0000|0x0001|0x0003|0x0007|0x000f|0x001f|0x003f|0x007f|0x00ff|0x01ff|0x03ff|0x07ff|0x0fff|0x1fff|0x7fff|513|2049|3073|4097|6145|8193|12289|16385|24577|65521|unshift|0x78|0xDA|deflate|00|cloneObjAttr|Object|hasOwnProperty|copy|obj|Its|type|isn|supported|stringify|convertBinaryToArray|alert32BitIn4Bytes|offset|over|memcpy2|splice|concat|membuild_wl|mallocStr|resStr|Error|WebPDecoder|no_incremental_decoding|rotate|uv_sampling|force_rotation|no_enhancement|use_threads|WebPDecoderConfig|WebPInitDecoderConfig|0x7f|B_PRED|NUM_B_DC_MODES|NUM_MV_PROBAS|WebPWorker|imodes_offset_|alpha_plane_off|STORE|OUT|WebPWorkerReset|thread|data1|data2|hook|mem_offset|during|12851|Could|decode|alpha|WebPWorkerLaunch|WebPGetDecoderVersion|mismatch|VP8|buf|buf_size|dec|passed|Truncated|Incorrect|keyframe|parameters|displayable|picture|Bad|code|word|bad|key|extra|i32|0x08040201|0x1000000|0x10000|0x1|0xff000000|Premature|end|file|encountered|Output|aborted|NULL|parameter|WebPWorkerEnd|0xf8|0xe0|0x0f|89858|22014|45773|113618|76283|0x00080008|slert|MemBufferMode|DecState|remap|shorter|buffer|mixed|modes|WebPIDecode|WebPIDelete|WebPINew|WebPINewRGB|WebPINewYUV|WebPIAppend|WebPIUpdate|WebPIDecodedArea|WebPIDecGetRGB|WebPIDecGetYUV|WebPISetIOHooks|WEBP|WebPDecodeRGBInto|WebPDecodeRGBAInto|WebPDecodeARGBInto|WebPDecodeBGRInto|WebPDecodeBGRAInto|WebPDecodeYUVInto|WebPDecodeRGB|WebPDecodeRGBA|WebPDecodeRGBA_4444|WebPDecodeARGB|WebPDecodeBGR|WebPDecodeBGRA|WebPDecode|WebPEncoder|WEBP_YUV420A|WEBP_YUV422A|WEBP_YUV444A|WEBP_YUV400A|WebPEncCSP|WebPWriterFunction|WebPEncodingError|0x7fffffffffffff|lambda_trellis_|proba_off|i4_boundary_off|0x9d012a|5225|00001|1408|1178|1061|911|896|838|820|811|794|752|732|709|704|690|683|672|655|647|631|622|615|607|598|576|564|559|555|547|541|528|504|500|494|483|473|467|461|458|452|448|443|438|434|427|415|410|406|399|394|390|377|374|366|359|355|351|347|333|326|320|312|308|296|293|283|277|272|266|262|0x000|0x007|0x005|0x00d|618|630|731|828|948|1021|1174|1042|1115|1245|1318|1497|1570|1613|1295|1317|1332|1358|1373|1395|1506|1532|1584|1616|1679|1694|1812|1827|1890|1905|1727|1742|1748|1765|1774|1806|1832|1838|1899|1966|1972|1983|1989|1998|2004|2027|2033|2042|2065|2074|2080|2100|2106|2115|2132|2147|2153|2178|2184|2193|2210|2225|2231|2251|2257|2266|2272|2283|2289|2298|2304|2168|2174|2200|2215|2221|2241|2256|2262|2273|2279|2288|2294|2319|2334|2340|2351|2357|2366|2372|2398|2407|2413|2424|2439|2445|2468|2474|2483|2489|2500|2506|2515|2521|2541|2547|2556|2562|2573|2579|2588|2594|2625|2640|2657|2672|2692|2698|2707|2713|2724|2730|2739|2745|2540|2546|2555|2561|2572|2578|2587|2593|2613|2628|2645|2660|2691|2697|2706|2712|2723|2729|2738|2744|2764|2770|2779|2785|2796|2802|2811|2817|2840|2846|2855|2861|2872|2878|2887|2893|2913|2919|2928|2934|2945|2951|2960|2966|2991|2997|3006|3012|3023|3029|3038|3044|3064|3070|3079|3085|3096|3102|3111|3117|2981|2987|2996|3002|3013|3019|3028|3034|3054|3060|3069|3075|3086|3101|3107|3132|3138|3147|3153|3164|3170|3179|3185|3205|3211|3220|3226|3237|3243|3252|3258|3281|3287|3296|3302|3313|3319|3328|3334|3354|3360|3369|3375|3386|3392|3401|3407|3432|3438|3447|3453|3464|3470|3479|3485|3505|3511|3520|3526|3537|3543|3552|3558|2816|2822|2831|2837|2848|2854|2863|2869|2889|2895|2904|2910|2921|2927|2936|2942|2967|2973|2982|2988|2999|3005|3014|3020|3040|3046|3055|3061|3072|3078|3087|3093|3116|3122|3131|3137|3148|3154|3163|3169|3189|3195|3204|3210|3221|3227|3236|3242|3267|3282|3288|3299|3305|3314|3320|3340|3346|3355|3361|3372|3378|3387|3393|3257|3263|3272|3289|3295|3304|3310|3330|3336|3345|3351|3362|3368|3377|3383|3408|3414|3423|3429|3440|3446|3455|3461|3481|3487|3496|3502|3513|3519|3528|3534|3557|3563|3572|3578|3589|3595|3604|3610|3630|3645|3651|3662|3668|3677|3683|3714|3729|3746|3761|3781|3787|3796|3802|3813|3819|3828|3834|3629|3644|3650|3661|3667|3676|3682|3702|3717|3734|3749|3780|3795|3801|3812|3818|3827|3833|3859|3874|3885|3891|3900|3906|3929|3944|3950|3961|3967|3976|3982|4002|4008|4017|4023|4034|4040|4049|4055|4080|4095|4101|4112|4118|4127|4133|4153|4159|4168|4174|4185|4191|4200|4206|4070|4085|4091|4102|4108|4117|4123|4143|4149|4158|4164|4175|4181|4190|4196|4221|4236|4242|4253|4259|4268|4274|4300|4315|4326|4332|4341|4347|4370|4385|4391|4402|4408|4417|4423|4443|4449|4458|4464|4475|4481|4490|4496|4521|4536|4542|4553|4559|4568|4574|4594|4600|4609|4615|4626|4632|4641|4647|5303|5309|5318|5324|5335|5341|5350|5356|5376|5382|5391|5397|5408|5414|5429|5454|5460|5469|5475|5486|5492|5501||5507|5527|5533|5542|5548|5559|5565|5580|5603|5609|5618|5624|5635|5650|5676|5682|5691|5697|5708|5714|5729|5754|5760|5769|5775|5786|5792|5801|5807|5827|5833|5842|5848|5859|5865|5880|5744|5750|5759|5765|5776|5782|5791|5797|5817|5823|5832|5838|5849|5855|5870|5895|5901|5910|5916|5927|5933|5942|5948|5968|5974|5983|5989|6000|6006|6021|6044|6050|6059|6065|6076|6091|6117|6123|6132|6138|6149|6155|6170|6201|6216|6233|6248|6268|6274|6283|6289|6300|6306|6321|6116|6122|6131|6137|6148|6154|6163|6169|6189|6204|6221|6236|6267|6273|6282|6288|6299|6305|6314|6320|6340|6346|6355|6361|6372|6378|6387|6393|6416|6422|6431|6437|6448|6454|6463|6469|6489|6495|6504|6510|6521|6527|6536|6542|6567|6573|6582|6588|6599|6605|6614|6620|6640|6646|6655|6661|6672|6678|6687|6693|6557|6563|6572|6578|6589|6595|6604|6610|6630|6636|6645|6651|6662|6668|6677|6683|6708|6714|6723|6729|6740|6746|6755|6761|6781|6787|6796|6802|6813|6819|6828|6834|6857|6863|6872|6878|6889|6895|6904|6910|6930|6936|6945|6951|6962|6968|6977|6983|7008|7014|7023|7029|7040|7046|7055|7061|7081|7087|7096|7102|7113|7119|7128|7134|6392|6398|6407|6413|6424|6430|6439|6445|6465|6471|6480|6486|6497|6503|6512|6518|6543|6549|6558|6564|6575|6581|6590|6596|6616|6622||6631|6637|6648|6654|6663|6669|6692|6698|6707|6713|6724|6730|6739|6745|6765|6771|6780|6786|6797|6803|6812|6818|6843|6849|6858|6864|6875|6881|6890|6896|6916|6922|6931|6937|6948|6954|6963|6969|6833|6839|6848|6854|6865|6871|6880|6886|6906|6912|6921|6927|6938|6944|6953|6959|6984|6990|6999|7005|7016|7022|7031|7037|7057|7063|7072|7078|7089|7095|7104|7110|7133|7139|7148|7154|7165|7171|7180|7186|7206|7212|7221|7227|7238|7244|7253|7259|7290|7305|7322|7337|7357|7363|7372|7378|7389|7395|7404|7410|7205|7211|7220|7226|7237|7243|7252|7258|7278|7293|7310|7325|7356|7362|7371|7377|7388|7394|7403|7409|7429|7435|7444|7450|7461|7467|7476|7482|7505|7511|7520|7526|7537|7543|7552|7558|7578|7584|7593|7599|7610|7616|7625|7631|7656|7662|7671|7677|7688|7694|7703|7709|7729|7735|7744|7750|7761|984|642|872|1362|1934|2085|2314|2230|1988|2437|2348|680|1519|2005|1992|1914|353|1121|973|1895|1787|1671|1516|2012|852|1581|632|1936|1467|1080|918|1300|1814|1502|425|1514|1843|2440|937|1771|1129|363|1970|2194|2385|953|1631|1697|1824|671|635|1038|1673|1413|1687|749|451|1702|1728|1766|2190|2310|678|453|1171|1443|2045|1781|1887|1602|674|1718|542|2149|669|994|1122|949|1376|1070|1244|1717|841|1656|1450|3883|1010|2076|809|855|2067|824|2066|1416|819|1277|1619|1501|757|879|1594|764|1747|1192|1819|1877|1622|2072|1431|1888|1346|1764|456|2165|2281|1405|2443|1078|1342|1191|1436|1063|995|727|1105|1401|595|1388|1724|986|1987|1485|1399|695|1978|1726|1986|1326|714|1750|1217|1209|1548|932|1284|784|1256|1557|1098|1357|908|1075|2051|1730|2131|745|1599|2375|2013|2105|1475|729|1637|3426|1531|468|2259|2069|1763|1266|1235|1767|1104|1258|739|1151|1412|846|1305|2726|1014|558|825|1398|3344|429|1089|1816|969|1568|1468|2346|1298|1686|1700|1306|1033|1579|1723|1993|725|1029|1176|1567|1259|859|802|1253|972|1407|1665|1520|1674|1254|887|1607|1344|1349|865|1150|842|1068|688|1630|938|1546|3338|1031|1542|1090|835|1603|1019|1102|1813|1194|1919|1644|1281|1283|1688|1434|889|971|1146|1849|1857|1683|1371|1426|821|2079|783|857|1419|814|1791|1310|997|1000|792|1229|942|793|1904|1649|3108|782|455|1591|1997|1504|1114|3311|676|1138|1314|1315|1157|804|1320|869|1384|834|1239|775|1007|843|1225|2527|817|1439|1159|1945|577|796|1271|1458|1265|776|753|||||||||||1940|1097|3149|1744|1161|1565|1106|1230|707|915|1428|2425|1043|790|1082|985|1083|1484|1238|1160|507|2261|1995|653|2287|1470|779|2058|1263|499|1496|1385|1044|2465|978|2077|1968|1481|1457|761|2362|694|864|905|1670|1429|718|2125|1477|658|3190|2024|||||||||||1865|750|2320|1308|1576|1172|816|927|947|1156|1073|3056|1534|892|928|2111|1712|3501|1155|2130|1133|2343|1944|3733|1287|487|3546|1758|1585|2673|1185|1006|758|1023|1351|376|1446|1545|1577|1789|1175|633|1136|1058|1323|1598|1072|1048|1869|1461|1107|1282|||||||||||1779|1933|1648|2403|691|1246|1223|1593|2317|627|1030|1125|921|1629|1131|1049|1646|626|1081|1489|1498|1201|812|970|1503|414|1614|1490|682|1505|322|1142|1589|2144|1859|1359|2084|1518|625|1234|1615|1524|1858|1004|1452|1560|1967|977|568|1639|2108|1013|||||||||||684|1120|982|2719|1643|993|996|1356|1005|1247|1817|3606|1666|1829|923|1139|3710|1922|1040|935|1269|1535|827|1036|1543|712|coeffs_off|info|263|292|311|317|348|354|379|393|401|409|416|440|pow|SwapPtr|14500|7500|12000|51000|Preset|preset|16384|WebPGetEncoderVersion|size_off|16839|||||||||||33059|9719|19081|24116|4684|WebPEncodeRGB|WebPEncodeBGR|WebPEncodeRGBA|WebPEncodeBGRA|WebPEncodeConfig|ReturnExtraInfo|All|count|skipped|used|mode|Residuals|chroma|macroblocks|quantizer'.split('|'),0,{}));

//*******//

(function($){
	$.fn.closestCSSValue = function(property, value, different, returnValue){
		var self = $(this).first();
		var closestElement = $();
		var closestValue = null;
		
		if(typeof different != 'boolean'){
			different = false;
		}
		
		if(typeof returnValue != 'boolean'){
			returnValue = false;
		}
		
		if($.type(property) == 'string' && $.type(value) == 'string'){
			self.parents().each(function(){
				var currentParent = $(this);
				
				if((currentParent.css(property) == value && ! different) || (currentParent.css(property) != value && different)){
					closestElement = currentParent;
					closestValue = currentParent.css(property);
					
					return false;
				}
			});
		}
		
		if(returnValue){
			return closestValue;
		}else{
			return closestElement;
		}
	}
})(jQuery);

if(typeof $ == 'undefined'){
	window.onload = function(){		
		addScript('http://code.jquery.com/jquery-1.11.0.min.js');
	};
}

var encoder;
var encodingStart;
var encodingDone;
var framesReady;
var frames;
var dataURL;
var actionBar = $();
var createButton = $();
var downloadButton = $();
var downloadGIFButton = $();
var animationCanvas;
var ugoiraData;
var block;
var player;
var fileName;
var radioButtons = $();
var chr = false;

if(navigator.userAgent.indexOf('Chrome') != -1 && parseFloat(navigator.userAgent.substring(navigator.userAgent.indexOf('Chrome') + 7).split(' ')[0]) >= 15){//Chrome
	 chr = true;
}

var reset = function(){
	encoder = null;
	encodingStart = false;
	encodingDone = false;
	framesReady = false;
	frames = [];
	dataURL = null;
	animationCanvas = $();
	ugoiraData = {};
	block = $();
	player = null;
	fileName = '';
}

reset();

var addScript = function(src){
	var head = document.getElementsByTagName('head')[0];
	var newScript = document.createElement('script');
	
	newScript.src = src;
	newScript.type = 'text/javascript';
	
	head.appendChild(newScript);
};

var resizeImageLayer = function(){
	var html = $('html');
	var body = $('body');
	var positionTop = body.offset().top + body.scrollTop() + html.scrollTop();
	var positionLeft = body.offset().left + body.scrollLeft() + html.scrollLeft();
	
	block
		.offset({
			top: positionTop,
			left: positionLeft
		})
		.width($(window).width())
		.height($(window).height())
		.find('img, video')
			.each(function(){
				var thisImage = $(this);
				var imgLayerActionBar = thisImage.siblings('.actionBar');
				
				thisImage
					.offset({
						left: block.offset().left + ((block.width() - thisImage.width()) / 2),
						top: block.offset().top + ((block.height() - thisImage.height()) / 2)
					});
				
				imgLayerActionBar
					.offset({
						left: thisImage.offset().left + thisImage.width() - imgLayerActionBar.outerWidth(false),
						top: thisImage.offset().top - imgLayerActionBar.outerHeight(false)
					});
			});
};

$(window).on('resize', resizeImageLayer);

var timeout = 0;
var interval = setInterval(function(){
	if(actionBar.length > 0){
		actionBar.offset({
			left: animationCanvas.offset().left + ((animationCanvas.width() - actionBar.outerWidth(false)) / 2),
			top: animationCanvas.offset().top + animationCanvas.height()
		})
	}
	
	if(animationCanvas.length == 1 && animationCanvas.closest('body').length == 0){
		createButton.hide();
		downloadButton.hide();
		downloadGIFButton.css('display', 'none');
		
		reset();
		
		pixivUgoiraGIF();
	}
}, 100);

var buttonStyle = {
	border: '1px solid #CFCFCF',
	borderRadius: '5px',
	padding: '3px 7px',
	background: '#FFF',
	cursor: 'pointer'
};

var pixivUgoiraGIF = function(){
	animationCanvas = $('canvas').filter('[data-ugoira]');
	
	if(animationCanvas.length == 0){
		animationCanvas = $('canvas');
		
		if(animationCanvas.length == 0){
			timeout = setTimeout(pixivUgoiraGIF, 500);
			
			return false;
		}
		
		ugoiraData = pixiv.context.ugokuIllustData;
	}else{
		ugoiraData = animationCanvas.data('ugoira');
	}	
	
	if(animationCanvas.length == 1 && ! $.isEmptyObject(ugoiraData)){
		if(actionBar.length == 0){
			actionBar = $('<div>')
				.css({
					position: 'absolute',
					zIndex: 10000
				})
				.appendTo('body');
		}
		
		frames = ugoiraData.frames;
		
		if(createButton.length == 0){
			createButton = $('<button class="createButton">');
			createButton
				.appendTo(actionBar)
				.css(buttonStyle);
		}else{
			createButton.show();
		}
		
		if(radioButtons.length == 0){
			radioButtons = $('<input type="radio" name="type" value="gif" checked /><span>GIF</span><input type="radio" name="type" value="webm" /><span>WEBM</span>')
				.filter('span')
					.css({
						margin: '0 5px'
					})
				.end()
				.filter('[value="webm"]')
					.on('click', function(){
						var thisRadio = $(this);
						
						if(thisRadio.val() == 'webm' && thisRadio.is(':checked') && !chr){
							if(! confirm('The WEBM conversion is currently fully supported only in Chrome. In Firefox, WEBM encoding is supported but it could result in slow performance or brief freezing. ¿Are you sure you want to continue?')){
								radioButtons
									.filter('[value="gif"]')
									.prop('checked', true);
								
								return false;
							}
						}
					})
				.end()
				.appendTo(actionBar)
				.hide();
		}
		
		createButton
			.text('Loading frames...')
			.prop('disabled', true)
			.off('click')
			.on('click', function(){
				var thisButton = $(this).prop('disabled', true);
							
				if(!encodingStart && !encodingDone){
					encodingStart = true;
					
					if($('[name="type"]:checked').val() == 'gif'){
						encoder = new GIFEncoder();						
						encoder.setRepeat(0);
						encoder.start();
					}else{
						encoder = new Whammy.Video();
					}
					
					player.rewind();
	            	
	            	radioButtons.hide();
					
					thisButton
						.text('Creating. Wait...')
						.data('initial-text', thisButton.text());
				}
				
				return false;
			});
		
		if(downloadGIFButton.length == 0){
			downloadGIFButton = $('<a>Download!</a>');
			downloadGIFButton
				.css(buttonStyle)
				.css('display', 'none')
				.on({
					click: function(){
						var thisButton = $(this);
						
						thisButton.attr({
							download: fileName,
							href: dataURL
						});
					}
				})
				.appendTo(actionBar);
		}
		
		if(downloadButton.length == 0){
			downloadButton = $('<button class="downloadButton">');
			downloadButton
				.appendTo(actionBar)
				.css(buttonStyle);
		}else{
			downloadButton.show();
		}
		
		downloadButton
			.text('Download ZIP!')
			.off('click')
			.on('click', function(){
				window.open(ugoiraData.src);
				
				return false;
			});
		
		ZipImagePlayer.prototype._displayFrame = function() {
			player = this;
			
	        if (!this._dead) {
	            var t = this,
	                e = this.op.metadata.frames[this._frame];
	            this._debugLog("Displaying frame: " + this._frame + " " + e.file);
	            var n = this._frameImages[this._frame];
	            
	            if(this._frameImages.length == frames.length){
	            	if(encodingStart){
	            		if(this._frame == 0){
	            			framesReady = true;
	            		}
	            	}else{
	        			radioButtons.show();
	            		
	            		createButton
	            			.text('Create!')
		            		.prop('disabled', false);
	            	}
	            }
            	
        		var createImageLayer = function(){
	            	block = $('<div>')
	            		.css({
	            			overflow: 'auto',
	            			position: 'fixed',
	            			zIndex: 20000,
	            			backgroundColor: 'rgba(0, 0, 0, 0.75)'
	            		})
	            		.on('click', function(){
	            			block.remove();
	            		})
	            		.appendTo('body');
	            	
	            	var elementString = '<';
	            	
	            	if($('[name="type"]:checked').val() == 'gif'){
	            		elementString += 'img';
	            	}else{
	            		elementString += 'video autoplay controls loop';
	            	}
	            	
	            	elementString += ' src="' + dataURL + '">';
	            	
	            	$(elementString)
            			.width(this._context.canvas.width)
            			.height(this._context.canvas.height)
            			.on('click', function(event){
            				event.stopPropagation();
            			})
            			.css({
            				position: 'absolute'
            			})
	            		.appendTo(block);
	            	
	            	var imgLayerActionBar = $('<div class="actionBar">')
	            		.css({
	            			position: 'absolute'
	            		})
	            		.appendTo(block);
	            	
	            	$('<button class="closeButton">Close</button>')
	            		.css(buttonStyle)
	            		.on('click', function(){
	            			block.remove();
	            		})
	            		.appendTo(imgLayerActionBar);
	            	
	            	resizeImageLayer();
        		}
	            
	            if (!n) return this._debugLog("Image not available!"), void this._setLoadingState(0);
	            if($('[name="type"]:checked').val() == 'gif'){
		            2 != this._loadingState && this._setLoadingState(1), this.op.autosize && (this._context.canvas.width != n.width || this._context.canvas.height != n.height) && (this._context.canvas.width = n.width, this._context.canvas.height = n.height), this._context.clearRect(0, 0, this.op.canvas.width, this.op.canvas.height), this._context.drawImage(n, 0, 0), (framesReady && !encodingDone && encodingStart) ? encoder.setDelay(ugoiraData.frames[this._frame].delay):'', (framesReady && !encodingDone && encodingStart) ? encoder.addFrame(this._context):'', (framesReady && !encodingDone && encodingStart) ? createButton.text(createButton.data('initial-text') + ' [Frame ' + (this._frame + 1) + ' of ' + frames.length + ']'):'', $(this).triggerHandler("frame", this._frame), this._paused || (this._timer = setTimeout(function() {
		                t._timer = null, t._nextFrame.apply(t)
		            }, e.delay))
	            }else{
	            	2 != this._loadingState && this._setLoadingState(1), this.op.autosize && (this._context.canvas.width != n.width || this._context.canvas.height != n.height) && (this._context.canvas.width = n.width, this._context.canvas.height = n.height), this._context.clearRect(0, 0, this.op.canvas.width, this.op.canvas.height), this._context.drawImage(n, 0, 0), (framesReady && !encodingDone && encodingStart) ? encoder.add(this._context, ugoiraData.frames[this._frame].delay):'', (framesReady && !encodingDone && encodingStart) ? createButton.text(createButton.data('initial-text') + ' [Frame ' + (this._frame + 1) + ' of ' + frames.length + ']'):'', $(this).triggerHandler("frame", this._frame), this._paused || (this._timer = setTimeout(function() {
		                t._timer = null, t._nextFrame.apply(t)
		            }, e.delay))
	            }
	            
	        	if(!encodingDone && framesReady && this._frame == frames.length - 1){   
	        		if(!encodingDone){
		            	encodingDone = true;
		            	
		            	var srcArray = ugoiraData.src. split('/');
		            			            	
		            	if($('[name="type"]:checked').val() == 'gif'){
			            	fileName = srcArray[srcArray.length - 1].replace('.zip', '.gif');
		            		encoder.finish();
		            		
		            		var str = encoder.stream().getData();
		            		var bytes = new Uint8Array(str.length);
		            		for (var i=0; i<str.length; i++)
		            		    bytes[i] = str.charCodeAt(i);
		            		
		            		var blob = new Blob([bytes], {type: 'image/gif'});
		            		dataURL = URL.createObjectURL(blob);
		            	}else{
			            	fileName = srcArray[srcArray.length - 1].replace('.zip', '.webm');
			            	
			            	dataURL = URL.createObjectURL(encoder.compile());
		            	}

		            	downloadGIFButton.css('display', 'inline');
		            	
		            	var self = this;
		            	
		            	createButton
		        			.text('View!')
		        			.prop('disabled', false)
		        			.off('click')
		        			.on('click', function(){
		        				createImageLayer.call(self);
		        				
		        				return false;
		        			});
		        	}
	        	}
	        }
	    };
	}
}

$(document).ready(function(){
	pixivUgoiraGIF();
});
