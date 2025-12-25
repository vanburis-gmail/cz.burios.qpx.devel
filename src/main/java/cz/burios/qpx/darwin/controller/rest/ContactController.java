package cz.burios.qpx.darwin.controller.rest;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import cz.burios.qpx.darwin.db.dao.BasicRecord;
import cz.burios.qpx.darwin.db.dao.DSL;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/data") 
public class ContactController {

	@GetMapping("/contacts") 
	public List<BasicRecord> getList(
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) String filters,
            @RequestParam(required = false) int page,
            @RequestParam(required = false) int pageSize) {
		
		System.out.println("ContactController.getAll()");
		try {

		} catch (Exception e) {
			e.printStackTrace();
		}
		List<BasicRecord> contacts = getAllData();
		return contacts;
	}

	protected List<BasicRecord> getAllData() {
		List<BasicRecord> data = new ArrayList<>();
		try {
			data = DSL.select("NUMBER", "CODE3", "CODE2", "NAME").from("countries").execute();
		} catch (Exception e) {
			e.printStackTrace();
		}
		// System.out.println("ContactController.getAllData().data:\n" + data);
		return data;
	}
}