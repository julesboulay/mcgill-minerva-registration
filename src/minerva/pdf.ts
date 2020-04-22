import fs from "fs";
import { PDF, PDFinfo } from "./types";
import { timenow } from "./util";

const makeDir = async (dirPath: string) => {
  return new Promise<void>(function (resolve, reject) {
    fs.exists(dirPath, (exits) => {
      if (exits) return resolve();

      fs.mkdir(dirPath, (error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  });
};

const deleteFilesInDir = async (dirPath: string): Promise<void> => {
  return new Promise<void>(function (resolve, reject) {
    fs.readdir(dirPath, (error, files) => {
      if (error) return reject(error);
      console.log(files);

      for (const file of files)
        fs.unlink(`${dirPath}/${file}`, (error) => {
          if (error) return reject(error);
        });

      resolve();
    });
  });
};

const readFile = async (filepath: string): Promise<PDFinfo> => {
  return new Promise<PDFinfo>(function (resolve, reject) {
    fs.readFile(filepath, (error, data) => {
      if (error) return reject(error);
      const info: PDFinfo = JSON.parse(data.toString());
      resolve(info);
    });
  });
};

const writeFile = async (filepath: string, data: string): Promise<void> => {
  return new Promise<void>(function (resolve, reject) {
    fs.writeFile(filepath, data, (error) => {
      if (error) return reject(error);
      resolve();
    });
  });
};

class PDFsHandler {
  private jsonfilepath: string;

  constructor(private dirPath: string) {
    this.jsonfilepath = `${this.dirPath}/pdfs.json`;
  }

  /**
   * Creates PDFs directory, cleans it if exists already, and inits
   * the PDF info file.
   */
  public async init() {
    await makeDir(this.dirPath);
    await deleteFilesInDir(this.dirPath);

    const content: PDFinfo = {
      errors: [],
      registrations: [],
    };
    const data = JSON.stringify(content, undefined, 4);
    await writeFile(this.jsonfilepath, data);
  }

  /**
   * Save new PDF info.
   * @param ftype
   * @param count
   * @param content
   */
  public async savePDFinfo(
    ftype: PDF,
    count: number,
    content: string
  ): Promise<void> {
    const info: PDFinfo = await readFile(this.jsonfilepath);
    switch (ftype) {
      case "error":
        info.errors.push({
          filename: `${this.dirPath}/error${count}.pdf`,
          timestamp: timenow(),
          stack: content,
        });
        return await writeFile(this.dirPath, content);

      case "success":
        info.registrations.push({
          filename: `${this.dirPath}/error${count}.pdf`,
          timestamp: timenow(),
          crn: content,
        });
        return await writeFile(this.dirPath, content);

      default:
    }
  }
}

export default PDFsHandler;
