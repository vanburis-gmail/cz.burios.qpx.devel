package cz.burios.qpx.darwin.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.servlet.ModelAndView;

@Controller
public class TestController {
	
	@GetMapping("/download")
	public ModelAndView showDownloadForm() {
		ModelAndView view = new ModelAndView("download");
		try {
			
		} catch (Exception e) {
			e.printStackTrace();
		}
		return view;
	}

	@GetMapping("/upload")
	public ModelAndView showUploadForm() {
		ModelAndView view = new ModelAndView("upload");
		try {
			
		} catch (Exception e) {
			e.printStackTrace();
		}
		return view;
	}	
}